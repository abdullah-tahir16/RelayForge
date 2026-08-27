import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
  encryptSigningSecret,
  hashSigningSecret,
} from '@relayforge/webhook-signing';
import { AppModule } from '../src/app.module';

const SIGNING_KEY = Buffer.alloc(32, 6);
const SIGNING_SECRET = 'rfs_delivery_attempts_e2e_secret';
const SIGNING_ENVELOPE = encryptSigningSecret(SIGNING_SECRET, SIGNING_KEY);

describe('Delivery attempt history API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  async function registerAndLogin(): Promise<string> {
    const email = `attempt-${randomUUID()}@example.com`;
    const password = 'correct-horse-battery';
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password })
      .expect(201);
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(201);
    return response.body.accessToken;
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

  it('orders redacted attempts and hides another workspace delivery', async () => {
    const ownerToken = await registerAndLogin();
    const otherToken = await registerAndLogin();
    const projectResponse = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: `Attempts ${randomUUID()}` })
      .expect(201);
    const projectId = projectResponse.body.id;
    const endpointId = randomUUID();
    const eventId = randomUUID();
    const deliveryId = randomUUID();
    const runId = randomUUID();
    await dataSource.query(
      `INSERT INTO endpoints (
        id, project_id, name, url, signing_secret_encrypted,
        signing_secret_hash, signing_secret_version, signing_secret_rotated_at
      ) VALUES ($1, $2, 'Attempts', 'https://example.com', $3, $4, 1, now())`,
      [endpointId, projectId, SIGNING_ENVELOPE, hashSigningSecret(SIGNING_SECRET)],
    );
    await dataSource.query(
      `INSERT INTO events (id, project_id, event_type, payload, status) VALUES ($1, $2, 'attempt.test', '{}', 'FAILED')`,
      [eventId, projectId],
    );
    await dataSource.transaction(async (manager) => {
      await manager.query(
        `INSERT INTO deliveries (
          id, event_id, endpoint_id, status, attempt_count, current_run_id
        ) VALUES ($1, $2, $3, 'FAILED', 2, $4)`,
        [deliveryId, eventId, endpointId, runId],
      );
      await manager.query(
        `INSERT INTO delivery_runs (
          id, delivery_id, run_number, trigger, status, attempt_limit,
          attempt_count, initial_job_published_at, failed_at
        ) VALUES ($1, $2, 1, 'INITIAL', 'FAILED', 5, 2, now(), now())`,
        [runId, deliveryId],
      );
    });
    await dataSource.query(
      `INSERT INTO delivery_attempts (
        delivery_id, run_id, attempt_number, run_attempt_number,
        request_headers, response_status,
        response_headers, duration_ms, started_at, completed_at
      ) VALUES
        ($1, $2, 2, 2, '{"Authorization":"[REDACTED]"}', 500, '{"set-cookie":"[REDACTED]"}', 20, now(), now()),
        ($1, $2, 1, 1, '{"Authorization":"[REDACTED]"}', 503, '{}', 10, now(), now())`,
      [deliveryId, runId],
    );

    const response = await request(app.getHttpServer())
      .get(`/api/v1/deliveries/${deliveryId}/attempts`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(response.body.map((attempt: any) => attempt.attemptNumber)).toEqual([1, 2]);
    expect(response.body[1].requestHeaders.Authorization).toBe('[REDACTED]');
    expect(response.body[1].responseHeaders['set-cookie']).toBe('[REDACTED]');
    expect(response.body[0]).toMatchObject({
      runId,
      runNumber: 1,
      runTrigger: 'INITIAL',
      runAttemptNumber: 1,
    });

    await request(app.getHttpServer())
      .get(`/api/v1/deliveries/${deliveryId}/attempts`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });
});
