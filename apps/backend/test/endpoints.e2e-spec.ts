import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { SubscriptionEntity } from '../src/subscriptions/entities/subscription.entity';

describe('Endpoints (e2e)', () => {
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

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    dataSource = moduleFixture.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  let ownerToken: string;
  let otherToken: string;
  let projectId: string;
  let endpointId: string;

  beforeAll(async () => {
    ownerToken = await registerAndLogin();
    otherToken = await registerAndLogin();
    projectId = await createProject(ownerToken);
  });

  it('registers an endpoint, enabled by default, with a default timeout', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/endpoints`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Fulfilment', url: 'https://example.com/webhook' })
      .expect(201);

    expect(res.body.enabled).toBe(true);
    expect(res.body.timeoutMs).toBe(10000);
    expect(res.body.disabledAt).toBeNull();
    endpointId = res.body.id;
  });

  it('rejects a blocklisted-hostname URL', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/endpoints`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Evil', url: 'http://169.254.169.254/latest/meta-data' })
      .expect(400);
  });

  it('rejects a timeout above the maximum', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/endpoints`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'TooSlow',
        url: 'https://example.com/webhook',
        timeoutMs: 60000,
      })
      .expect(400);
  });

  it('404s registering an endpoint for another workspace project', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/endpoints`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ name: 'Stolen', url: 'https://example.com/webhook' })
      .expect(404);
  });

  it('lists only the caller workspace endpoints', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/endpoints`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(res.body.map((e: any) => e.id)).toContain(endpointId);
  });

  it('fetches an endpoint the caller owns, 404s for another workspace', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/endpoints/${endpointId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/endpoints/${endpointId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });

  it('updates the endpoint URL with the same validation as registration', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/endpoints/${endpointId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ url: 'https://updated.example.com/webhook' })
      .expect(200);
    expect(res.body.url).toBe('https://updated.example.com/webhook');

    await request(app.getHttpServer())
      .patch(`/api/v1/endpoints/${endpointId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ url: 'http://localhost/webhook' })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/api/v1/endpoints/${endpointId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ name: 'hijacked' })
      .expect(404);
  });

  it('disables then re-enables the endpoint', async () => {
    const disableRes = await request(app.getHttpServer())
      .post(`/api/v1/endpoints/${endpointId}/disable`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(201);
    expect(disableRes.body.enabled).toBe(false);
    expect(disableRes.body.disabledAt).not.toBeNull();

    const enableRes = await request(app.getHttpServer())
      .post(`/api/v1/endpoints/${endpointId}/enable`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(201);
    expect(enableRes.body.enabled).toBe(true);
    expect(enableRes.body.disabledAt).toBeNull();
  });

  it('404s enabling/disabling another workspace endpoint', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/endpoints/${endpointId}/disable`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
    await request(app.getHttpServer())
      .post(`/api/v1/endpoints/${endpointId}/enable`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });

  it('404s deleting another workspace endpoint, then cascade-deletes subscriptions on real deletion', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/endpoints/${endpointId}/subscriptions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ eventPattern: 'order.*' })
      .expect(201);

    const beforeCount = await dataSource
      .getRepository(SubscriptionEntity)
      .count({ where: { endpointId } });
    expect(beforeCount).toBe(1);

    await request(app.getHttpServer())
      .delete(`/api/v1/endpoints/${endpointId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/v1/endpoints/${endpointId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);

    const afterCount = await dataSource
      .getRepository(SubscriptionEntity)
      .count({ where: { endpointId } });
    expect(afterCount).toBe(0);

    await request(app.getHttpServer())
      .get(`/api/v1/endpoints/${endpointId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);
  });
});
