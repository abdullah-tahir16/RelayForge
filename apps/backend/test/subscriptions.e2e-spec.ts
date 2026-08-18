import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Subscriptions (e2e)', () => {
  let app: INestApplication;

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

  async function createEndpoint(
    token: string,
    projectId: string,
  ): Promise<string> {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/endpoints`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Fulfilment', url: 'https://example.com/webhook' })
      .expect(201);
    return res.body.id;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  let ownerToken: string;
  let otherToken: string;
  let endpointId: string;
  let subscriptionId: string;

  beforeAll(async () => {
    ownerToken = await registerAndLogin();
    otherToken = await registerAndLogin();
    const projectId = await createProject(ownerToken);
    endpointId = await createEndpoint(ownerToken, projectId);
  });

  it('subscribes to an exact event type', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/endpoints/${endpointId}/subscriptions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ eventPattern: 'order.completed' })
      .expect(201);
    expect(res.body.eventPattern).toBe('order.completed');
    subscriptionId = res.body.id;
  });

  it('subscribes to a wildcard pattern', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/endpoints/${endpointId}/subscriptions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ eventPattern: 'invoice.*' })
      .expect(201);
  });

  it('rejects a malformed pattern', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/endpoints/${endpointId}/subscriptions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ eventPattern: '*.order' })
      .expect(400);
  });

  it('404s subscribing to another workspace endpoint', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/endpoints/${endpointId}/subscriptions`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ eventPattern: 'order.completed' })
      .expect(404);
  });

  it('lists subscriptions for the caller-owned endpoint, paginated', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/endpoints/${endpointId}/subscriptions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(25);
    expect(res.body.total).toBe(2);
  });

  it('404s listing subscriptions for another workspace endpoint', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/endpoints/${endpointId}/subscriptions`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });

  it('404s unsubscribing from another workspace endpoint, then unsubscribes for the owner', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/subscriptions/${subscriptionId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/v1/subscriptions/${subscriptionId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/endpoints/${endpointId}/subscriptions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(res.body.items.map((s: any) => s.id)).not.toContain(
      subscriptionId,
    );
  });
});
