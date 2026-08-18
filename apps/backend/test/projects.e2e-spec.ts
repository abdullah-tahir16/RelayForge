import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Projects (e2e)', () => {
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
  let projectId: string;

  beforeAll(async () => {
    ownerToken = await registerAndLogin();
    otherToken = await registerAndLogin();
  });

  it('creates a project with a generated key', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'E-Commerce' })
      .expect(201);

    expect(res.body.name).toBe('E-Commerce');
    expect(res.body.key).toBe('e-commerce');
    projectId = res.body.id;
  });

  it('rejects creating a project without a name', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({})
      .expect(400);
  });

  it('lists only the caller workspace projects, paginated', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(res.body.items.map((p: any) => p.id)).toContain(projectId);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(25);
    expect(typeof res.body.total).toBe('number');

    const otherRes = await request(app.getHttpServer())
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(200);
    expect(otherRes.body.items.map((p: any) => p.id)).not.toContain(
      projectId,
    );
  });

  it('respects explicit page and pageSize', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/projects?page=1&pageSize=1')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(res.body.items.length).toBeLessThanOrEqual(1);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(1);
  });

  it('fetches a project the caller owns', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(res.body.id).toBe(projectId);
  });

  it('404s fetching another workspace project', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });

  it('updates name/description without changing the key', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'E-Commerce Renamed', description: 'updated' })
      .expect(200);

    expect(res.body.name).toBe('E-Commerce Renamed');
    expect(res.body.description).toBe('updated');
    expect(res.body.key).toBe('e-commerce');
  });

  it('404s updating another workspace project', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ name: 'hijacked' })
      .expect(404);
  });

  it('404s deleting another workspace project, then deletes it for the owner', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);
  });
});
