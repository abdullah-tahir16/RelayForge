import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { DeliveryEntity } from '../src/deliveries/entities/delivery.entity';

async function waitFor(
  predicate: () => Promise<boolean>,
  timeoutMs = 15000,
  intervalMs = 250,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

describe('Events read API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  async function registerAndLogin(): Promise<string> {
    const email = `test-${randomUUID()}@example.com`;
    const password = 'correct-horse-battery';
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password })
      .expect(201);
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(201);
    return res.body.accessToken;
  }

  async function createProject(token: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Project ${randomUUID()}` })
      .expect(201);
    return res.body.id;
  }

  async function generateApiKey(
    token: string,
    projectId: string,
  ): Promise<string> {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/api-keys`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ingestion key' })
      .expect(201);
    return res.body.key;
  }

  async function ingestEvent(
    apiKey: string,
    eventType: string,
  ): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({ event: eventType, data: { orderId: randomUUID() } })
      .expect(202);
    return res.body.id;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    dataSource = moduleFixture.get(DataSource);
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  let ownerToken: string;
  let otherToken: string;
  let projectId: string;
  let apiKey: string;
  let orderEventId: string;
  let invoiceEventId: string;

  beforeAll(async () => {
    ownerToken = await registerAndLogin();
    otherToken = await registerAndLogin();
    projectId = await createProject(ownerToken);
    apiKey = await generateApiKey(ownerToken, projectId);
    orderEventId = await ingestEvent(apiKey, 'order.completed');
    invoiceEventId = await ingestEvent(apiKey, 'invoice.failed');
  });

  it('lists events for the caller-owned project, paginated', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/events`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(res.body.items.map((e: any) => e.id)).toEqual(
      expect.arrayContaining([orderEventId, invoiceEventId]),
    );
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(25);
    const [first] = res.body.items;
    expect(first).toHaveProperty('event');
    expect(first).toHaveProperty('status');
    expect(first).toHaveProperty('createdAt');
    expect(first).toHaveProperty('deliveryTotal');
    expect(first).toHaveProperty('deliverySucceeded');
  });

  it('filters events by eventType', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/events?eventType=invoice.failed`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(res.body.items.map((e: any) => e.id)).toContain(invoiceEventId);
    expect(res.body.items.map((e: any) => e.id)).not.toContain(orderEventId);
  });

  it('filters events by status', async () => {
    // No subscriptions exist in this project, so the routing consumer
    // asynchronously advances both events straight to COMPLETED (per
    // "no matching subscriptions" in deliveries/spec.md) shortly after
    // ingestion — PUBLISHED is not a stable status to assert against here.
    await waitFor(async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/events?status=COMPLETED`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      const ids = res.body.items.map((e: any) => e.id);
      return ids.includes(orderEventId) && ids.includes(invoiceEventId);
    });
  }, 20000);

  it('filters events by created-date range', async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const res = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/events?createdFrom=${future}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(res.body.items).toHaveLength(0);
  });

  it('filters events by endpoint via a real routed delivery', async () => {
    const endpointRes = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/endpoints`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Filter target', url: 'http://webhook.localhost:1/x' })
      .expect(201);
    const endpointId = endpointRes.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/endpoints/${endpointId}/subscriptions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ eventPattern: 'order.completed' })
      .expect(201);

    const routedEventId = await ingestEvent(apiKey, 'order.completed');

    await waitFor(async () => {
      const count = await dataSource
        .getRepository(DeliveryEntity)
        .count({ where: { eventId: routedEventId, endpointId } });
      return count === 1;
    });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/events?endpointId=${endpointId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(res.body.items.map((e: any) => e.id)).toEqual([routedEventId]);
  }, 20000);

  it('404s listing events for another workspace project', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/events`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });

  it('fetches a single event the caller owns', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/events/${orderEventId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(res.body.id).toBe(orderEventId);
    expect(res.body.event).toBe('order.completed');
    expect(res.body.payload).toHaveProperty('orderId');
  });

  it('404s fetching another workspace event', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/events/${orderEventId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });
});
