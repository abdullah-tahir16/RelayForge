import * as http from 'http';
import { AddressInfo } from 'net';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import {
  deliveryJobId,
  DeliveryRequestedMessageV4,
} from '@relayforge/kafka-contracts';
import {
  encryptSigningSecret,
  hashSigningSecret,
  verifyWebhookSignature,
} from '@relayforge/webhook-signing';
import { Admin, Kafka } from 'kafkajs';
import { KafkaClientService } from '../kafka/kafka-client.service';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { KafkaTopicsService } from '../kafka/kafka-topics.service';
import { DeliveriesSqlRepository } from './deliveries-sql.repository';
import { DeliveryConsumerService } from './delivery-consumer.service';
import { PgPoolService } from './pg-pool.service';
import { RetryConsumerService } from './retry-consumer.service';
import { RetryPolicyService } from './retry-policy.service';
import { RetryPublisherService } from './retry-publisher.service';
import { WebhookSenderService } from './webhook-sender.service';
import { DeadLetterPublisherService } from './dead-letter-publisher.service';

const BROKERS = (process.env.KAFKA_BROKERS ?? 'localhost:9094').split(',');
const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgres://relayforge:relayforge@localhost:5432/relayforge';
const SIGNING_KEY = Buffer.alloc(32, 11);
const SIGNING_SECRET = 'rfs_pipeline_secret';
const SIGNING_ENVELOPE = encryptSigningSecret(SIGNING_SECRET, SIGNING_KEY);

async function waitFor(
  predicate: () => Promise<boolean> | boolean,
  timeoutMs = 15_000,
  intervalMs = 50,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

describe('delivery retry pipeline (Docker Compose integration)', () => {
  const suffix = randomUUID();
  const deliveriesTopic = `relayforge.test.pipeline.deliveries.${suffix}`;
  const retryTopics = [1, 2, 3, 4].map(
    (stage) => `relayforge.test.pipeline.retry-${stage}.${suffix}`,
  );
  const dlqTopic = `relayforge.test.pipeline.dlq.${suffix}`;
  const deliveryConsumerGroup = `relayforge-test-delivery-${suffix}`;
  const retryConsumerGroup = `relayforge-test-pipeline-retry-${suffix}`;
  const createdUserIds: string[] = [];
  const createdProjectIds: string[] = [];

  let webhookServer: http.Server;
  let webhookPort: number;
  const requestsByPath = new Map<string, number>();
  const signaturesByPath = new Map<
    string,
    Array<{ timestamp: string; signature: string; body: string }>
  >();
  let admin: Admin;
  let pgPool: PgPoolService;
  let producer: KafkaProducerService;
  let deliveryConsumer: DeliveryConsumerService;
  let retryConsumer: RetryConsumerService;

  const config = new ConfigService({
    database: { url: DATABASE_URL },
    kafka: {
      brokers: BROKERS,
      deliveriesTopic,
      deliveryConsumerGroup,
      retryTopics,
      retryConsumerGroup,
      dlqTopic,
    },
    delivery: {
      retryDelaysMs: [100, 100, 100, 100],
      maxAttempts: 5,
      processingLeaseMs: 5_000,
      responsePreviewMaxBytes: 4_096,
      sensitiveHeaders: [
        'authorization',
        'cookie',
        'set-cookie',
        'x-relayforge-signature',
      ],
    },
    signing: { encryptionKey: SIGNING_KEY },
  });

  async function waitForGroup(groupId: string): Promise<void> {
    await waitFor(async () => {
      const result = await admin.describeGroups([groupId]);
      const group = result.groups[0];
      return group?.state === 'Stable' && group.members.length > 0;
    });
  }

  async function createDelivery(path: string): Promise<DeliveryRequestedMessageV4> {
    const userId = randomUUID();
    const workspaceId = randomUUID();
    const projectId = randomUUID();
    const endpointId = randomUUID();
    const eventId = randomUUID();
    const deliveryId = randomUUID();
    const runId = randomUUID();
    createdUserIds.push(userId);
    createdProjectIds.push(projectId);

    await pgPool.pool.query(
      `INSERT INTO users (id, email, password_hash) VALUES ($1, $2, 'x')`,
      [userId, `${randomUUID()}@example.com`],
    );
    await pgPool.pool.query(
      `INSERT INTO workspaces (id, owner_user_id, name) VALUES ($1, $2, 'Test')`,
      [workspaceId, userId],
    );
    await pgPool.pool.query(
      `INSERT INTO projects (id, workspace_id, name, key) VALUES ($1, $2, 'Test', $3)`,
      [projectId, workspaceId, randomUUID()],
    );
    await pgPool.pool.query(
      `INSERT INTO endpoints (
        id, project_id, name, url, signing_secret_encrypted,
        signing_secret_hash, signing_secret_version, signing_secret_rotated_at
      ) VALUES ($1, $2, 'Test', $3, $4, $5, 1, now())`,
      [
        endpointId,
        projectId,
        `http://127.0.0.1:${webhookPort}${path}`,
        SIGNING_ENVELOPE,
        hashSigningSecret(SIGNING_SECRET),
      ],
    );
    await pgPool.pool.query(
      `INSERT INTO events (id, project_id, event_type, payload, status) VALUES ($1, $2, 'order.completed', '{}', 'PROCESSING')`,
      [eventId, projectId],
    );
    const client = await pgPool.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO deliveries (id, event_id, endpoint_id, status, current_run_id)
         VALUES ($1, $2, $3, 'PENDING', $4)`,
        [deliveryId, eventId, endpointId, runId],
      );
      await client.query(
        `INSERT INTO delivery_runs (
           id, delivery_id, run_number, trigger, status, initial_job_published_at
         ) VALUES ($1, $2, 1, 'INITIAL', 'PENDING', now())`,
        [runId, deliveryId],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return {
      version: 4,
      jobId: deliveryJobId(runId, 1),
      projectId,
      runId,
      runNumber: 1,
      attemptNumber: 1,
      runAttemptNumber: 1,
      scheduledAt: new Date().toISOString(),
      deliveryId,
      eventId,
      endpointId,
      eventType: 'order.completed',
      eventCreatedAt: new Date().toISOString(),
      data: {},
      endpointUrl: `http://127.0.0.1:${webhookPort}${path}`,
      endpointTimeoutMs: 1_000,
      endpointSigningSecretEncrypted: SIGNING_ENVELOPE,
      endpointSigningSecretVersion: 1,
    };
  }

  async function topicMessageCount(topic: string): Promise<number> {
    const offsets = await admin.fetchTopicOffsets(topic);
    return offsets.reduce(
      (total, partition) => total + Number(partition.high) - Number(partition.low),
      0,
    );
  }

  beforeAll(async () => {
    webhookServer = http.createServer((req, res) => {
      const path = req.url ?? '/';
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        const count = (requestsByPath.get(path) ?? 0) + 1;
        requestsByPath.set(path, count);
        const body = Buffer.concat(chunks).toString('utf8');
        const signed = signaturesByPath.get(path) ?? [];
        signed.push({
          timestamp: String(req.headers['x-relayforge-timestamp'] ?? ''),
          signature: String(req.headers['x-relayforge-signature'] ?? ''),
          body,
        });
        signaturesByPath.set(path, signed);
        const succeeds = path.startsWith('/flaky') ? count >= 2 : false;
        res.writeHead(succeeds ? 200 : 503, {
          'content-type': 'text/plain',
          'set-cookie': 'must-not-be-persisted',
        });
        res.end(succeeds ? 'ok' : 'try again');
      });
    });
    await new Promise<void>((resolve) => webhookServer.listen(0, resolve));
    webhookPort = (webhookServer.address() as AddressInfo).port;

    const client = new KafkaClientService(config);
    const topics = new KafkaTopicsService(client, config);
    producer = new KafkaProducerService(client);
    pgPool = new PgPoolService(config);
    const repository = new DeliveriesSqlRepository(pgPool);
    const retryPolicy = new RetryPolicyService(config);
    const retryPublisher = new RetryPublisherService(producer);
    const deadLetterPublisher = new DeadLetterPublisherService(
      producer,
      repository,
      config,
    );
    const webhookSender = new WebhookSenderService(config);
    deliveryConsumer = new DeliveryConsumerService(
      client,
      topics,
      webhookSender,
      repository,
      retryPolicy,
      retryPublisher,
      deadLetterPublisher,
      config,
    );
    retryConsumer = new RetryConsumerService(client, topics, producer, config);

    await topics.ensureTopics();
    await producer.onModuleInit();
    const kafka = new Kafka({
      clientId: `relayforge-pipeline-test-${suffix}`,
      brokers: BROKERS,
    });
    admin = kafka.admin();
    await admin.connect();
    await Promise.all([
      deliveryConsumer.onModuleInit(),
      retryConsumer.onModuleInit(),
    ]);
    await Promise.all([
      waitForGroup(deliveryConsumerGroup),
      waitForGroup(retryConsumerGroup),
    ]);
  }, 30_000);

  afterAll(async () => {
    await Promise.all([
      deliveryConsumer?.onModuleDestroy(),
      retryConsumer?.onModuleDestroy(),
    ]);
    await producer?.onModuleDestroy();
    for (const projectId of createdProjectIds) {
      await pgPool.pool.query(`DELETE FROM projects WHERE id = $1`, [projectId]);
    }
    for (const userId of createdUserIds) {
      await pgPool.pool.query(`DELETE FROM workspaces WHERE owner_user_id = $1`, [
        userId,
      ]);
      await pgPool.pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
    }
    await pgPool?.onModuleDestroy();
    await admin?.deleteTopics({
      topics: [deliveriesTopic, dlqTopic, ...retryTopics],
    });
    await admin?.disconnect();
    await new Promise<void>((resolve) => webhookServer.close(() => resolve()));
  }, 30_000);

  it('fails once, succeeds on retry, and persists both safe attempts', async () => {
    const path = `/flaky-${randomUUID()}`;
    const job = await createDelivery(path);
    await producer.publish(deliveriesTopic, job.projectId, job);

    await waitFor(async () => {
      const result = await pgPool.pool.query(
        `SELECT status FROM deliveries WHERE id = $1`,
        [job.deliveryId],
      );
      return result.rows[0]?.status === 'SUCCEEDED';
    });

    const attempts = await pgPool.pool.query(
      `SELECT attempt_number, request_headers, response_status, response_headers
       FROM delivery_attempts WHERE delivery_id = $1 ORDER BY attempt_number`,
      [job.deliveryId],
    );
    expect(attempts.rows).toHaveLength(2);
    expect(attempts.rows.map((row) => row.response_status)).toEqual([503, 200]);
    expect(attempts.rows[0].response_headers['set-cookie']).toBe('[REDACTED]');
    expect(attempts.rows[0].request_headers['X-RelayForge-Signature']).toBe(
      '[REDACTED]',
    );
    const signed = signaturesByPath.get(path) ?? [];
    expect(signed).toHaveLength(2);
    for (const request of signed) {
      expect(
        verifyWebhookSignature(
          SIGNING_SECRET,
          request.timestamp,
          request.body,
          request.signature,
        ),
      ).toBe(true);
    }
    expect(await topicMessageCount(retryTopics[0])).toBe(1);
  }, 20_000);

  it('exhausts five attempts, publishes a safe dead letter, and ignores the stale job', async () => {
    const job = await createDelivery(`/always-fail-${randomUUID()}`);
    await producer.publish(deliveriesTopic, job.projectId, job);

    await waitFor(
      async () => {
        const result = await pgPool.pool.query(
          `SELECT status, attempt_count FROM deliveries WHERE id = $1`,
          [job.deliveryId],
        );
        return (
          result.rows[0]?.status === 'DEAD_LETTERED' &&
          result.rows[0]?.attempt_count === 5
        );
      },
      30_000,
    );

    const attempts = await pgPool.pool.query(
      `SELECT attempt_number FROM delivery_attempts
       WHERE delivery_id = $1 ORDER BY attempt_number`,
      [job.deliveryId],
    );
    expect(attempts.rows.map((row) => row.attempt_number)).toEqual([1, 2, 3, 4, 5]);
    for (const topic of retryTopics) {
      expect(await topicMessageCount(topic)).toBeGreaterThanOrEqual(1);
    }
    expect(await topicMessageCount(dlqTopic)).toBe(1);

    await producer.publish(deliveriesTopic, job.projectId, job);
    await new Promise((resolve) => setTimeout(resolve, 250));
    const count = await pgPool.pool.query(
      `SELECT count(*) FROM delivery_attempts WHERE delivery_id = $1`,
      [job.deliveryId],
    );
    expect(Number(count.rows[0].count)).toBe(5);
  }, 40_000);
});
