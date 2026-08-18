import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { json, urlencoded } from 'express';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { EventEntity } from '../src/events/entities/event.entity';

const MAX_REQUEST_BODY_BYTES = 300 * 1024;

describe('Events ingestion (e2e)', () => {
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
  ): Promise<{ key: string; id: string }> {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/api-keys`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ingestion key' })
      .expect(201);
    return { key: res.body.key, id: res.body.id };
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    app.use(json({ limit: MAX_REQUEST_BODY_BYTES }));
    app.use(urlencoded({ extended: true, limit: MAX_REQUEST_BODY_BYTES }));
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    dataSource = moduleFixture.get(DataSource);
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  let userToken: string;
  let projectId: string;
  let apiKey: string;

  beforeAll(async () => {
    userToken = await registerAndLogin();
    projectId = await createProject(userToken);
    apiKey = (await generateApiKey(userToken, projectId)).key;
  });

  it('ingests an event, persisting and publishing it', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({ event: 'order.completed', data: { orderId: 'ORD-123' } })
      .expect(202);

    expect(res.body.event).toBe('order.completed');
    expect(res.body.status).toBe('PUBLISHED');
    expect(res.body.id).toBeDefined();

    const event = await dataSource
      .getRepository(EventEntity)
      .findOne({ where: { id: res.body.id } });
    expect(event).not.toBeNull();
    expect(event?.status).toBe('PUBLISHED');
    expect(event?.publishedAt).not.toBeNull();
    expect(event?.projectId).toBe(projectId);
  });

  it('rejects a request with no Authorization header', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/events')
      .send({ event: 'order.completed', data: {} })
      .expect(401);
  });

  it('rejects a request with an unknown API key', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/events')
      .set('Authorization', 'Bearer rf_live_deadbeefdeadbeefdeadbeefdeadbeef')
      .send({ event: 'order.completed', data: {} })
      .expect(401);
  });

  it('rejects a request with a revoked API key', async () => {
    const revocable = await generateApiKey(userToken, projectId);
    await request(app.getHttpServer())
      .delete(`/api/v1/api-keys/${revocable.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${revocable.key}`)
      .send({ event: 'order.completed', data: {} })
      .expect(401);
  });

  it('rejects a malformed event type', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({ event: 'Order.Completed', data: {} })
      .expect(400);
  });

  it('rejects an oversized data payload', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        event: 'order.completed',
        data: { blob: 'x'.repeat(280 * 1024) },
      })
      .expect(413);
  });

  it('accepts a payload above the old 100kb Express default but within the 256kb limit', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        event: 'order.completed',
        data: { blob: 'x'.repeat(150 * 1024) },
      })
      .expect(202);
  });
});
