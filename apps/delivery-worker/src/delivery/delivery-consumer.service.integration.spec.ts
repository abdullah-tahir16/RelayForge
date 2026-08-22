import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import {
  DeliveryRequestedMessage,
  DeliveryRetryScheduledMessage,
} from '@relayforge/kafka-contracts';
import { DeliveryConsumerService } from './delivery-consumer.service';
import { DeliveriesSqlRepository } from './deliveries-sql.repository';
import { PgPoolService } from './pg-pool.service';
import { WebhookSenderService, WebhookSendResult } from './webhook-sender.service';
import { RetryPolicyService } from './retry-policy.service';
import { RetryPublisherService } from './retry-publisher.service';

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
    await pool.query(
      `INSERT INTO deliveries (id, event_id, endpoint_id, status) VALUES ($1, $2, $3, 'PENDING')`,
      [deliveryId, eventId, endpointId],
    );
    return { projectId, eventId, endpointId, deliveryId };
  }

  function message(ids: Awaited<ReturnType<typeof createDelivery>>): DeliveryRequestedMessage {
    return {
      version: 2,
      jobId: `${ids.deliveryId}:1`,
      projectId: ids.projectId,
      attemptNumber: 1,
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
    const service = new DeliveryConsumerService(
      {} as any,
      {} as any,
      webhookSender,
      repository,
      retryPolicy,
      retryPublisher,
      config,
    );
    return { service, webhookSender, producer };
  }

  it('atomically claims one attempt and recovers it after lease expiry', async () => {
    const ids = await createDelivery();
    const first = await repository.claimAttempt(ids.deliveryId, 1, {}, 5000);
    expect(first.status).toBe('claimed');
    const duplicate = await repository.claimAttempt(ids.deliveryId, 1, {}, 5000);
    expect(duplicate.status).toBe('active_duplicate');
    await pool.query(
      `UPDATE deliveries SET processing_expires_at = now() - interval '1 second' WHERE id = $1`,
      [ids.deliveryId],
    );
    const recovered = await repository.claimAttempt(ids.deliveryId, 1, {}, 20);
    expect(recovered.status).toBe('claimed');
    expect(recovered.processingToken).not.toBe(first.processingToken);
    const count = await pool.query(
      `SELECT count(*) FROM delivery_attempts WHERE delivery_id = $1`,
      [ids.deliveryId],
    );
    expect(Number(count.rows[0].count)).toBe(1);
  });

  it('normalizes retained v1 jobs and does not resend a completed attempt', async () => {
    const ids = await createDelivery();
    const context = createService([result(true, 200)], 5);
    const v2 = message(ids);
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
    let current = message(ids);
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await context.service.processDelivery(current);
      if (attempt < 5) {
        const scheduled = context.producer.publish.mock.calls[attempt - 1][2] as DeliveryRetryScheduledMessage;
        await new Promise((resolve) => setTimeout(resolve, 3));
        current = scheduled.delivery;
      }
    }
    expect(context.producer.publish).toHaveBeenCalledTimes(4);
    const delivery = await pool.query(
      `SELECT status, attempt_count, next_attempt_at FROM deliveries WHERE id = $1`,
      [ids.deliveryId],
    );
    expect(delivery.rows[0]).toMatchObject({
      status: 'FAILED',
      attempt_count: 5,
      next_attempt_at: null,
    });
    const attempts = await pool.query(
      `SELECT count(*) FROM delivery_attempts WHERE delivery_id = $1`,
      [ids.deliveryId],
    );
    expect(Number(attempts.rows[0].count)).toBe(5);
  });
});
