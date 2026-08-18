import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { DeliveryRequestedMessage } from '@relayforge/kafka-contracts';
import { DeliveryConsumerService } from './delivery-consumer.service';
import { DeliveriesSqlRepository } from './deliveries-sql.repository';
import { PgPoolService } from './pg-pool.service';
import { WebhookSenderService } from './webhook-sender.service';

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgres://relayforge:relayforge@localhost:5432/relayforge';

describe('DeliveryConsumerService (integration)', () => {
  let pool: Pool;
  let pgPoolService: PgPoolService;
  let deliveriesSqlRepository: DeliveriesSqlRepository;

  beforeAll(() => {
    pool = new Pool({ connectionString: DATABASE_URL });
    pgPoolService = { pool } as PgPoolService;
    deliveriesSqlRepository = new DeliveriesSqlRepository(pgPoolService);
  });

  afterAll(async () => {
    await pool.end();
  });

  async function insertProject(): Promise<string> {
    const workspaceId = randomUUID();
    const userId = randomUUID();
    await pool.query(
      `INSERT INTO users (id, email, password_hash) VALUES ($1, $2, 'x')`,
      [userId, `${randomUUID()}@example.com`],
    );
    await pool.query(
      `INSERT INTO workspaces (id, owner_user_id, name) VALUES ($1, $2, 'Test Workspace')`,
      [workspaceId, userId],
    );
    const projectId = randomUUID();
    await pool.query(
      `INSERT INTO projects (id, workspace_id, name, key) VALUES ($1, $2, 'Test', $3)`,
      [projectId, workspaceId, randomUUID()],
    );
    return projectId;
  }

  async function insertEndpoint(projectId: string): Promise<string> {
    const endpointId = randomUUID();
    await pool.query(
      `INSERT INTO endpoints (id, project_id, name, url) VALUES ($1, $2, 'Test', 'https://example.com/webhook')`,
      [endpointId, projectId],
    );
    return endpointId;
  }

  async function insertEvent(projectId: string): Promise<string> {
    const eventId = randomUUID();
    await pool.query(
      `INSERT INTO events (id, project_id, event_type, payload, status) VALUES ($1, $2, 'order.completed', '{}', 'PROCESSING')`,
      [eventId, projectId],
    );
    return eventId;
  }

  async function insertDelivery(
    eventId: string,
    endpointId: string,
    status: 'PENDING' | 'SUCCEEDED' | 'FAILED',
  ): Promise<string> {
    const deliveryId = randomUUID();
    await pool.query(
      `INSERT INTO deliveries (id, event_id, endpoint_id, status) VALUES ($1, $2, $3, $4)`,
      [deliveryId, eventId, endpointId, status],
    );
    return deliveryId;
  }

  it('does not send a webhook for a delivery already SUCCEEDED', async () => {
    const projectId = await insertProject();
    const endpointId = await insertEndpoint(projectId);
    const eventId = await insertEvent(projectId);
    const deliveryId = await insertDelivery(eventId, endpointId, 'SUCCEEDED');

    const webhookSender = { send: jest.fn() } as unknown as WebhookSenderService;
    const service = new DeliveryConsumerService(
      {} as any,
      {} as any,
      webhookSender,
      deliveriesSqlRepository,
    );

    const message: DeliveryRequestedMessage = {
      version: 1,
      deliveryId,
      eventId,
      endpointId,
      eventType: 'order.completed',
      eventCreatedAt: new Date().toISOString(),
      data: {},
      endpointUrl: 'https://example.com/webhook',
      endpointTimeoutMs: 10000,
    };

    await (service as any).processDelivery(message);

    expect(webhookSender.send).not.toHaveBeenCalled();
  });

  it('sends a webhook for a delivery still PENDING', async () => {
    const projectId = await insertProject();
    const endpointId = await insertEndpoint(projectId);
    const eventId = await insertEvent(projectId);
    const deliveryId = await insertDelivery(eventId, endpointId, 'PENDING');

    const webhookSender = {
      send: jest.fn().mockResolvedValue({ succeeded: true, statusCode: 200 }),
    } as unknown as WebhookSenderService;
    const service = new DeliveryConsumerService(
      {} as any,
      {} as any,
      webhookSender,
      deliveriesSqlRepository,
    );

    const message: DeliveryRequestedMessage = {
      version: 1,
      deliveryId,
      eventId,
      endpointId,
      eventType: 'order.completed',
      eventCreatedAt: new Date().toISOString(),
      data: {},
      endpointUrl: 'https://example.com/webhook',
      endpointTimeoutMs: 10000,
    };

    await (service as any).processDelivery(message);

    expect(webhookSender.send).toHaveBeenCalledTimes(1);
    const result = await pool.query(
      `SELECT status FROM deliveries WHERE id = $1`,
      [deliveryId],
    );
    expect(result.rows[0].status).toBe('SUCCEEDED');
  });
});
