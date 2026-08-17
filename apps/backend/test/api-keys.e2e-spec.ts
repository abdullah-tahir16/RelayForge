import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { ApiKeyEntity } from '../src/api-keys/entities/api-key.entity';

describe('API Keys (e2e)', () => {
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
  let apiKeyId: string;
  let fullKeyValue: string;

  beforeAll(async () => {
    ownerToken = await registerAndLogin();
    otherToken = await registerAndLogin();
    projectId = await createProject(ownerToken);
  });

  it('generates a key, returning the full value once', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/api-keys`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Production Backend' })
      .expect(201);

    expect(res.body.key).toMatch(/^rf_live_[0-9a-f]{32}$/);
    expect(res.body.keyPrefix).toBe(res.body.key.slice(0, 12));
    apiKeyId = res.body.id;
    fullKeyValue = res.body.key;
  });

  it('404s generating a key for another workspace project', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/api-keys`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ name: 'stolen' })
      .expect(404);
  });

  it('lists keys masked, never exposing the full value or hash', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/api-keys`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    const [key] = res.body;
    expect(key.id).toBe(apiKeyId);
    expect(key.keyPrefix).toBeDefined();
    expect(key.key).toBeUndefined();
    expect(key.keyHash).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain(fullKeyValue);
  });

  it('404s listing keys for another workspace project', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/api-keys`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });

  it('404s revoking a key belonging to another workspace project', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/api-keys/${apiKeyId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });

  it('revokes a key, which remains visible in listings as revoked', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/api-keys/${apiKeyId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(res.body.revokedAt).not.toBeNull();

    const listRes = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/api-keys`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].revokedAt).not.toBeNull();
  });

  it('cascade-deletes the API key row when the project is deleted', async () => {
    const beforeCount = await dataSource
      .getRepository(ApiKeyEntity)
      .count({ where: { projectId } });
    expect(beforeCount).toBe(1);

    await request(app.getHttpServer())
      .delete(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);

    const afterCount = await dataSource
      .getRepository(ApiKeyEntity)
      .count({ where: { projectId } });
    expect(afterCount).toBe(0);
  });
});
