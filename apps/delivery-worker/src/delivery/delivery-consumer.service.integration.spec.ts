import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import {
  deliveryJobId,
  DeliveryRequestedMessage,
  DeliveryRequestedMessageV2,
  DeliveryRequestedMessageV3,
  DeliveryRetryScheduledMessage,
  DLQ_TOPIC,
  normalizeDeliveryRequestedMessage,
} from '@relayforge/kafka-contracts';
import { DeliveryConsumerService } from './delivery-consumer.service';
import { DeliveriesSqlRepository } from './deliveries-sql.repository';
import { PgPoolService } from './pg-pool.service';
import { WebhookSenderService, WebhookSendResult } from './webhook-sender.service';
import { RetryPolicyService } from './retry-policy.service';
import { RetryPublisherService } from './retry-publisher.service';
import { DeadLetterPublisherService } from './dead-letter-publisher.service';

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgres://relayforge:relayforge@localhost:5432/relayforge';

describe('delivery attempt state machine (integration)', () => {
  let pool: Pool;
  let repository: DeliveriesSqlRepository;

  beforeAll(() => {
    pool = new Pool({ connectionString: DATABASE_URL });
    repository = new DeliveriesSqlRepository({ pool } as PgPoolService);
  });

  afterAll(async () => {
    await pool.end();
  });

  async function createDelivery() {
    const userId = randomUUID();
    const workspaceId = randomUUID();
    const projectId = randomUUID();
    const endpointId = randomUUID();
    const eventId = randomUUID();
    const deliveryId = randomUUID();
    const runId = randomUUID();
    await pool.query(
      `INSERT INTO users (id, email, password_hash) VALUES ($1, $2, 'x')`,
      [userId, `${randomUUID()}@example.com`],
    );
    await pool.query(
      `INSERT INTO workspaces (id, owner_user_id, name) VALUES ($1, $2, 'Test')`,
      [workspaceId, userId],
    );
    await pool.query(
      `INSERT INTO projects (id, workspace_id, name, key) VALUES ($1, $2, 'Test', $3)`,
      [projectId, workspaceId, randomUUID()],
    );
    await pool.query(
      `INSERT INTO endpoints (id, project_id, name, url) VALUES ($1, $2, 'Test', 'https://example.com')`,
      [endpointId, projectId],
    );
    await pool.query(
      `INSERT INTO events (id, project_id, event_type, payload, status) VALUES ($1, $2, 'order.completed', '{}', 'PROCESSING')`,
      [eventId, projectId],
    );
    const client = await pool.connect();
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
    return { projectId, eventId, endpointId, deliveryId, runId };
  }

  function message(
    ids: Awaited<ReturnType<typeof createDelivery>>,
  ): DeliveryRequestedMessageV3 {
    return {
      version: 3,
      jobId: deliveryJobId(ids.runId, 1),
      projectId: ids.projectId,
      runId: ids.runId,
      runNumber: 1,
      attemptNumber: 1,
      runAttemptNumber: 1,
      scheduledAt: new Date().toISOString(),
      deliveryId: ids.deliveryId,
      eventId: ids.eventId,
      endpointId: ids.endpointId,
      eventType: 'order.completed',
      eventCreatedAt: new Date().toISOString(),
      data: {},
      endpointUrl: 'https://example.com',
      endpointTimeoutMs: 1000,
    };
  }

  function result(succeeded: boolean, statusCode: number | null): WebhookSendResult {
    return {
      succeeded,
      statusCode,
      responseHeaders: { 'content-type': 'text/plain', 'set-cookie': 'secret' },
      responseBodyPreview: succeeded ? 'ok' : 'unavailable',
      errorCode: statusCode === null ? 'NETWORK_ERROR' : null,
      errorMessage: statusCode === null ? 'Webhook request failed' : null,
    };
  }

  async function startManualRun(
    ids: Awaited<ReturnType<typeof createDelivery>>,
    runNumber = 2,
  ): Promise<DeliveryRequestedMessageV3> {
    const runId = randomUUID();
    const delivery = await pool.query(
      `SELECT attempt_count FROM deliveries WHERE id = $1`,
      [ids.deliveryId],
    );
    const globalAttemptNumber = Number(delivery.rows[0].attempt_count) + 1;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO delivery_runs (
          id, delivery_id, run_number, trigger, status
        ) VALUES ($1, $2, $3, 'MANUAL', 'PENDING')`,
        [runId, ids.deliveryId, runNumber],
      );
      await client.query(
        `UPDATE deliveries SET current_run_id = $2, status = 'PENDING',
          next_attempt_at = NULL, completed_at = NULL, failed_at = NULL,
          dead_lettered_at = NULL, http_status_code = NULL, duration_ms = NULL
         WHERE id = $1`,
        [ids.deliveryId, runId],
      );
      await client.query(
        `UPDATE events SET status = 'PROCESSING' WHERE id = $1`,
        [ids.eventId],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return {
      ...message(ids),
      jobId: deliveryJobId(runId, 1),
      runId,
      runNumber,
      attemptNumber: globalAttemptNumber,
      runAttemptNumber: 1,
      scheduledAt: new Date().toISOString(),
    };
  }

  function createService(results: WebhookSendResult[], maxAttempts: number) {
    const config = new ConfigService({
      delivery: {
        retryDelaysMs: [1, 1, 1, 1],
        maxAttempts,
        processingLeaseMs: 50,
        sensitiveHeaders: ['authorization', 'cookie', 'set-cookie'],
      },
    });
    const webhookSender = {
      send: jest.fn().mockImplementation(async () => results.shift()),
    } as unknown as WebhookSenderService;
    const producer = { publish: jest.fn().mockResolvedValue(undefined) };
    const retryPolicy = new RetryPolicyService(config);
    const retryPublisher = new RetryPublisherService(producer as any);
    const deadLetterPublisher = new DeadLetterPublisherService(
      producer as any,
      repository,
      config,
    );
    const service = new DeliveryConsumerService(
      {} as any,
      {} as any,
      webhookSender,
      repository,
      retryPolicy,
      retryPublisher,
      deadLetterPublisher,
      config,
    );
    return { service, webhookSender, producer };
  }

  it('atomically claims one attempt and recovers it after lease expiry', async () => {
    const ids = await createDelivery();
    const job = normalizeDeliveryRequestedMessage(message(ids));
    const first = await repository.claimAttempt(job, {}, 5000, 5);
    expect(first.status).toBe('claimed');
    const duplicate = await repository.claimAttempt(job, {}, 5000, 5);
    expect(duplicate.status).toBe('active_duplicate');
    await pool.query(
      `UPDATE deliveries SET processing_expires_at = now() - interval '1 second' WHERE id = $1`,
      [ids.deliveryId],
    );
    const recovered = await repository.claimAttempt(job, {}, 20, 5);
    expect(recovered.status).toBe('claimed');
    expect(recovered.processingToken).not.toBe(first.processingToken);
    const count = await pool.query(
      `SELECT count(*) FROM delivery_attempts WHERE delivery_id = $1`,
      [ids.deliveryId],
    );
    expect(Number(count.rows[0].count)).toBe(1);
  });

  it('enforces one active run and treats retained jobs as stale after a manual replay begins', async () => {
    const activeIds = await createDelivery();
    await expect(
      pool.query(
        `INSERT INTO delivery_runs (
          delivery_id, run_number, trigger, status
        ) VALUES ($1, 2, 'MANUAL', 'PENDING')`,
        [activeIds.deliveryId],
      ),
    ).rejects.toThrow();

    const ids = await createDelivery();
    await pool.query(
      `UPDATE delivery_runs SET status = 'SUCCEEDED', completed_at = now()
       WHERE id = $1`,
      [ids.runId],
    );
    await pool.query(
      `UPDATE deliveries SET status = 'SUCCEEDED', completed_at = now()
       WHERE id = $1`,
      [ids.deliveryId],
    );
    await startManualRun(ids);
    const context = createService([result(true, 200)], 5);
    const initial = message(ids);
    const retainedV2: DeliveryRequestedMessageV2 = {
      version: 2,
      jobId: `${ids.deliveryId}:1`,
      projectId: ids.projectId,
      attemptNumber: 1,
      scheduledAt: initial.scheduledAt,
      deliveryId: initial.deliveryId,
      eventId: initial.eventId,
      endpointId: initial.endpointId,
      eventType: initial.eventType,
      eventCreatedAt: initial.eventCreatedAt,
      data: initial.data,
      endpointUrl: initial.endpointUrl,
      endpointTimeoutMs: initial.endpointTimeoutMs,
    };
    await context.service.processDelivery(retainedV2);
    await context.service.processDelivery(initial);
    expect(context.webhookSender.send).not.toHaveBeenCalled();
    const attempts = await pool.query(
      `SELECT COUNT(*)::int AS count FROM delivery_attempts WHERE delivery_id = $1`,
      [ids.deliveryId],
    );
    expect(attempts.rows[0].count).toBe(0);
  });

  it('normalizes retained v1 jobs and does not resend a completed attempt', async () => {
    const ids = await createDelivery();
    const context = createService([result(true, 200)], 5);
    const v3 = message(ids);
    const v2: DeliveryRequestedMessageV2 = {
      version: 2,
      jobId: `${ids.deliveryId}:1`,
      projectId: ids.projectId,
      attemptNumber: 1,
      scheduledAt: v3.scheduledAt,
      deliveryId: v3.deliveryId,
      eventId: v3.eventId,
      endpointId: v3.endpointId,
      eventType: v3.eventType,
      eventCreatedAt: v3.eventCreatedAt,
      data: v3.data,
      endpointUrl: v3.endpointUrl,
      endpointTimeoutMs: v3.endpointTimeoutMs,
    };
    const v1: DeliveryRequestedMessage = {
      version: 1,
      deliveryId: v2.deliveryId,
      eventId: v2.eventId,
      endpointId: v2.endpointId,
      eventType: v2.eventType,
      eventCreatedAt: v2.eventCreatedAt,
      data: v2.data,
      endpointUrl: v2.endpointUrl,
      endpointTimeoutMs: v2.endpointTimeoutMs,
    };
    await context.service.processDelivery(v1);
    await context.service.processDelivery(v2);
    expect(context.webhookSender.send).toHaveBeenCalledTimes(1);
    const attempts = await pool.query(
      `SELECT attempt_number FROM delivery_attempts WHERE delivery_id = $1`,
      [ids.deliveryId],
    );
    expect(attempts.rows).toEqual([{ attempt_number: 1 }]);
  });

  it('records a failure, schedules a retry, then succeeds on attempt two', async () => {
    const ids = await createDelivery();
    const context = createService([result(false, 503), result(true, 204)], 2);
    await context.service.processDelivery(message(ids));
    expect(context.producer.publish).toHaveBeenCalledTimes(1);
    const scheduled = context.producer.publish.mock.calls[0][2] as DeliveryRetryScheduledMessage;
    await new Promise((resolve) => setTimeout(resolve, 3));
    await context.service.processDelivery(scheduled.delivery);

    const delivery = await pool.query(
      `SELECT status, attempt_count, next_attempt_at FROM deliveries WHERE id = $1`,
      [ids.deliveryId],
    );
    expect(delivery.rows[0]).toMatchObject({
      status: 'SUCCEEDED',
      attempt_count: 2,
      next_attempt_at: null,
    });
    const attempts = await pool.query(
      `SELECT attempt_number, response_status, response_headers FROM delivery_attempts WHERE delivery_id = $1 ORDER BY attempt_number`,
      [ids.deliveryId],
    );
    expect(attempts.rows).toHaveLength(2);
    expect(attempts.rows[0].response_headers['set-cookie']).toBe('[REDACTED]');
    const event = await pool.query(`SELECT status FROM events WHERE id = $1`, [ids.eventId]);
    expect(event.rows[0].status).toBe('COMPLETED');
  });

  it('exhausts five failed attempts without scheduling a sixth', async () => {
    const ids = await createDelivery();
    const context = createService(Array.from({ length: 5 }, () => result(false, 500)), 5);
    let current: DeliveryRequestedMessage = message(ids);
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await context.service.processDelivery(current);
      if (attempt < 5) {
        const scheduled = context.producer.publish.mock.calls[attempt - 1][2] as DeliveryRetryScheduledMessage;
        await new Promise((resolve) => setTimeout(resolve, 3));
        current = scheduled.delivery;
      }
    }
    expect(context.producer.publish).toHaveBeenCalledTimes(5);
    const dlqCall = context.producer.publish.mock.calls.find(
      (call) => call[0] === DLQ_TOPIC,
    );
    expect(dlqCall?.[2]).toMatchObject({
      version: 1,
      deadLetterId: ids.runId,
      runId: ids.runId,
      attemptCount: 5,
      failureReason: 'HTTP_500',
    });
    expect(JSON.stringify(dlqCall?.[2])).not.toMatch(
      /endpointUrl|data|headers|body|credentials/i,
    );
    const delivery = await pool.query(
      `SELECT status, attempt_count, next_attempt_at FROM deliveries WHERE id = $1`,
      [ids.deliveryId],
    );
    expect(delivery.rows[0]).toMatchObject({
      status: 'DEAD_LETTERED',
      attempt_count: 5,
      next_attempt_at: null,
    });
    const attempts = await pool.query(
      `SELECT count(*) FROM delivery_attempts WHERE delivery_id = $1`,
      [ids.deliveryId],
    );
    expect(Number(attempts.rows[0].count)).toBe(5);
    const run = await pool.query(
      `SELECT status, attempt_count, attempt_limit, dlq_published_at
       FROM delivery_runs WHERE id = $1`,
      [ids.runId],
    );
    expect(run.rows[0]).toMatchObject({
      status: 'DEAD_LETTERED',
      attempt_count: 5,
      attempt_limit: 5,
    });
    expect(run.rows[0].dlq_published_at).toBeInstanceOf(Date);
    const event = await pool.query(`SELECT status FROM events WHERE id = $1`, [
      ids.eventId,
    ]);
    expect(event.rows[0].status).toBe('FAILED');
  });

  it('recovers a failed DLQ publish on source redelivery without another webhook attempt', async () => {
    const ids = await createDelivery();
    const context = createService(
      Array.from({ length: 5 }, () => result(false, 503)),
      5,
    );
    let failDlqOnce = true;
    context.producer.publish.mockImplementation(async (topic: string) => {
      if (topic === DLQ_TOPIC && failDlqOnce) {
        failDlqOnce = false;
        throw new Error('DLQ unavailable');
      }
    });

    let current: DeliveryRequestedMessage = message(ids);
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await context.service.processDelivery(current);
      const retries = context.producer.publish.mock.calls.filter(
        (call) => call[0] !== DLQ_TOPIC,
      );
      current = (retries.at(-1)?.[2] as DeliveryRetryScheduledMessage).delivery;
      await new Promise((resolve) => setTimeout(resolve, 3));
    }
    await expect(context.service.processDelivery(current)).rejects.toThrow(
      'DLQ unavailable',
    );
    expect(context.webhookSender.send).toHaveBeenCalledTimes(5);

    await context.service.processDelivery(current);
    expect(context.webhookSender.send).toHaveBeenCalledTimes(5);
    const dlqMessages = context.producer.publish.mock.calls
      .filter((call) => call[0] === DLQ_TOPIC)
      .map((call) => call[2] as any);
    expect(dlqMessages).toHaveLength(2);
    expect(dlqMessages[0].deadLetterId).toBe(ids.runId);
    expect(dlqMessages[1].deadLetterId).toBe(ids.runId);
    const attemptCount = await pool.query(
      `SELECT COUNT(*)::int AS count FROM delivery_attempts WHERE delivery_id = $1`,
      [ids.deliveryId],
    );
    expect(attemptCount.rows[0].count).toBe(5);
  });

  it('duplicates the stable notification when publish succeeds but its database mark fails', async () => {
    const ids = await createDelivery();
    const context = createService(
      Array.from({ length: 5 }, () => result(false, null)),
      5,
    );
    const mark = jest
      .spyOn(repository, 'markDeadLetterPublished')
      .mockRejectedValueOnce(new Error('mark failed'));

    let current: DeliveryRequestedMessage = message(ids);
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await context.service.processDelivery(current);
      const retries = context.producer.publish.mock.calls.filter(
        (call) => call[0] !== DLQ_TOPIC,
      );
      current = (retries.at(-1)?.[2] as DeliveryRetryScheduledMessage).delivery;
      await new Promise((resolve) => setTimeout(resolve, 3));
    }
    await expect(context.service.processDelivery(current)).rejects.toThrow(
      'mark failed',
    );
    await context.service.processDelivery(current);

    expect(context.webhookSender.send).toHaveBeenCalledTimes(5);
    const dlqMessages = context.producer.publish.mock.calls
      .filter((call) => call[0] === DLQ_TOPIC)
      .map((call) => call[2] as any);
    expect(dlqMessages).toHaveLength(2);
    expect(new Set(dlqMessages.map((item) => item.deadLetterId))).toEqual(
      new Set([ids.runId]),
    );
    expect(mark).toHaveBeenCalledTimes(2);
    mark.mockRestore();
  });

  it('replays a dead letter with a fresh budget and globally monotonic immutable attempts', async () => {
    const ids = await createDelivery();
    const context = createService(
      [
        ...Array.from({ length: 5 }, () => result(false, 503)),
        result(true, 204),
      ],
      5,
    );
    let current: DeliveryRequestedMessage = message(ids);
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await context.service.processDelivery(current);
      if (attempt < 5) {
        const retries = context.producer.publish.mock.calls.filter(
          (call) => call[0] !== DLQ_TOPIC,
        );
        current = (retries.at(-1)?.[2] as DeliveryRetryScheduledMessage).delivery;
        await new Promise((resolve) => setTimeout(resolve, 3));
      }
    }

    const replay = await startManualRun(ids);
    await context.service.processDelivery(replay);
    const delivery = await pool.query(
      `SELECT status, attempt_count FROM deliveries WHERE id = $1`,
      [ids.deliveryId],
    );
    expect(delivery.rows[0]).toMatchObject({
      status: 'SUCCEEDED',
      attempt_count: 6,
    });
    const attempts = await pool.query(
      `SELECT attempt_number, run_attempt_number, run_id
       FROM delivery_attempts WHERE delivery_id = $1 ORDER BY attempt_number`,
      [ids.deliveryId],
    );
    expect(attempts.rows.map((row) => row.attempt_number)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    expect(attempts.rows.at(-1)).toMatchObject({
      attempt_number: 6,
      run_attempt_number: 1,
      run_id: replay.runId,
    });
    const runs = await pool.query(
      `SELECT run_number, status, attempt_count, attempt_limit
       FROM delivery_runs WHERE delivery_id = $1 ORDER BY run_number`,
      [ids.deliveryId],
    );
    expect(runs.rows).toEqual([
      expect.objectContaining({ run_number: 1, status: 'DEAD_LETTERED', attempt_count: 5 }),
      expect.objectContaining({ run_number: 2, status: 'SUCCEEDED', attempt_count: 1, attempt_limit: 5 }),
    ]);
  });

  it('uses a new stable dead-letter identity when a replay run also exhausts', async () => {
    const ids = await createDelivery();
    const context = createService([result(false, 500), result(false, 500)], 1);
    await context.service.processDelivery(message(ids));
    const replay = await startManualRun(ids);
    await context.service.processDelivery(replay);

    const dlqMessages = context.producer.publish.mock.calls
      .filter((call) => call[0] === DLQ_TOPIC)
      .map((call) => call[2] as any);
    expect(dlqMessages).toHaveLength(2);
    expect(dlqMessages.map((item) => item.deadLetterId)).toEqual([
      ids.runId,
      replay.runId,
    ]);
    const runs = await pool.query(
      `SELECT run_number, status FROM delivery_runs
       WHERE delivery_id = $1 ORDER BY run_number`,
      [ids.deliveryId],
    );
    expect(runs.rows).toEqual([
      { run_number: 1, status: 'DEAD_LETTERED' },
      { run_number: 2, status: 'DEAD_LETTERED' },
    ]);
  });
});
