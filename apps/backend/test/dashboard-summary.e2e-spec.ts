import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

describe('Dashboard summary API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  async function registerAndLogin(prefix: string): Promise<string> {
    const email = `${prefix}-${randomUUID()}@example.com`;
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

  async function createEndpoint(token: string, projectId: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/endpoints`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Webhook', url: 'https://example.test/webhook' })
      .expect(201);
    return res.body.id;
  }

  async function insertEvent(
    projectId: string,
    status: string,
    createdAt: Date,
  ): Promise<string> {
    const id = randomUUID();
    await dataSource.query(
      `INSERT INTO events (id, project_id, event_type, payload, status, created_at)
       VALUES ($1, $2, 'order.completed', '{}', $3, $4)`,
      [id, projectId, status, createdAt],
    );
    return id;
  }

  async function insertDeadLetteredDelivery(
    eventId: string,
    endpointId: string,
  ): Promise<void> {
    const deliveryId = randomUUID();
    const runId = randomUUID();
    await dataSource.transaction(async (manager) => {
      await manager.query(
        `INSERT INTO deliveries (
          id, event_id, endpoint_id, status, attempt_count, current_run_id,
          dead_lettered_at, http_status_code
        ) VALUES ($1, $2, $3, 'DEAD_LETTERED', 5, $4, now(), 503)`,
        [deliveryId, eventId, endpointId, runId],
      );
      await manager.query(
        `INSERT INTO delivery_runs (
          id, delivery_id, run_number, trigger, status, attempt_limit,
          attempt_count, dead_lettered_at
        ) VALUES ($1, $2, 1, 'INITIAL', 'DEAD_LETTERED', 5, 5, now())`,
        [runId, deliveryId],
      );
    });
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    dataSource = moduleFixture.get(DataSource);
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  it('returns aggregate delivery health for the caller-owned project', async () => {
    const ownerToken = await registerAndLogin('summary-owner');
    const projectId = await createProject(ownerToken);

    const enabledEndpointId = await createEndpoint(ownerToken, projectId);
    const disabledEndpointId = await createEndpoint(ownerToken, projectId);
    await request(app.getHttpServer())
      .post(`/api/v1/endpoints/${disabledEndpointId}/disable`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(201);

    const older = new Date(Date.now() - 60_000);
    const newer = new Date();
    const inFlightEventId = await insertEvent(projectId, 'PROCESSING', older);
    const failedEventId = await insertEvent(projectId, 'FAILED', newer);
    await insertDeadLetteredDelivery(failedEventId, enabledEndpointId);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/summary`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(res.body).toMatchObject({
      inFlightCount: 1,
      needsAttentionCount: 1,
      dlqBacklogCount: 1,
      endpoints: { enabled: 1, disabled: 1 },
    });
    expect(res.body.recentActivity[0]).toMatchObject({
      eventId: failedEventId,
      status: 'FAILED',
    });
    expect(res.body.recentActivity.map((item: any) => item.eventId)).toEqual([
      failedEventId,
      inFlightEventId,
    ]);
  });

  it('returns zero counts for a project with no activity yet', async () => {
    const ownerToken = await registerAndLogin('summary-empty');
    const projectId = await createProject(ownerToken);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/summary`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(res.body).toEqual({
      inFlightCount: 0,
      needsAttentionCount: 0,
      dlqBacklogCount: 0,
      endpoints: { enabled: 0, disabled: 0 },
      recentActivity: [],
    });
  });

  it('404s requesting the summary for another workspace project', async () => {
    const ownerToken = await registerAndLogin('summary-owner-2');
    const otherToken = await registerAndLogin('summary-other');
    const projectId = await createProject(ownerToken);

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/summary`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });
});
