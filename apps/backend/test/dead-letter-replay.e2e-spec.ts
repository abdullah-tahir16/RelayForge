import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { KafkaProducerService } from '../src/kafka/kafka-producer.service';
import {
  encryptSigningSecret,
  hashSigningSecret,
} from '@relayforge/webhook-signing';

const SIGNING_KEY = Buffer.alloc(32);

describe('Dead-letter queue and replay APIs (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const publish = jest.fn<Promise<void>, [string, string, object]>();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(KafkaProducerService)
      .useValue({ publish })
      .compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    dataSource = moduleFixture.get(DataSource);
  }, 30_000);

  beforeEach(() => {
    publish.mockReset();
    publish.mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await app.close();
  });

  async function registerAndLogin(prefix: string): Promise<string> {
    const email = `${prefix}-${randomUUID()}@example.com`;
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

  async function createProject(token: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Replay ${randomUUID()}` })
      .expect(201);
    return response.body.id;
  }

  async function createEndpoint(
    projectId: string,
    enabled = true,
    url = 'https://current.example.test/webhook',
  ): Promise<string> {
    const id = randomUUID();
    const secret = `rfs_${randomUUID().replaceAll('-', '')}`;
    await dataSource.query(
      `INSERT INTO endpoints (
        id, project_id, name, url, enabled, disabled_at,
        signing_secret_encrypted, signing_secret_hash,
        signing_secret_version, signing_secret_rotated_at
      ) VALUES ($1, $2, $3, $4, $5, CASE WHEN $5 THEN NULL ELSE now() END,
        $6, $7, 1, now())`,
      [
        id,
        projectId,
        `Endpoint ${id.slice(0, 6)}`,
        url,
        enabled,
        encryptSigningSecret(secret, SIGNING_KEY),
        hashSigningSecret(secret),
      ],
    );
    return id;
  }

  async function createEvent(projectId: string): Promise<string> {
    const id = randomUUID();
    await dataSource.query(
      `INSERT INTO events (id, project_id, event_type, payload, status)
       VALUES ($1, $2, 'invoice.created', '{"invoiceId":"immutable"}', 'FAILED')`,
      [id, projectId],
    );
    return id;
  }

  async function createDelivery(input: {
    eventId: string;
    endpointId: string;
    status: 'DEAD_LETTERED' | 'FAILED' | 'SUCCEEDED';
    attemptCount?: number;
    deadLetteredAt?: Date;
  }): Promise<{ deliveryId: string; runId: string }> {
    const deliveryId = randomUUID();
    const runId = randomUUID();
    const attemptCount = input.attemptCount ?? 1;
    const at = input.deadLetteredAt ?? new Date();
    await dataSource.transaction(async (manager) => {
      await manager.query(
        `INSERT INTO deliveries (
          id, event_id, endpoint_id, status, attempt_count, current_run_id,
          completed_at, failed_at, dead_lettered_at, http_status_code
        ) VALUES ($1, $2, $3, $4::text::deliveries_status_enum, $5, $6,
          CASE WHEN $4::text = 'SUCCEEDED' THEN $7::timestamptz ELSE NULL END,
          CASE WHEN $4::text IN ('FAILED', 'DEAD_LETTERED') THEN $7::timestamptz ELSE NULL END,
          CASE WHEN $4::text = 'DEAD_LETTERED' THEN $7::timestamptz ELSE NULL END, 503)`,
        [
          deliveryId,
          input.eventId,
          input.endpointId,
          input.status,
          attemptCount,
          runId,
          at,
        ],
      );
      await manager.query(
        `INSERT INTO delivery_runs (
          id, delivery_id, run_number, trigger, status, attempt_limit,
          attempt_count, initial_job_published_at, completed_at, failed_at,
          dead_lettered_at
        ) VALUES ($1, $2, 1, 'INITIAL', $3::text::delivery_runs_status_enum,
          5, $4, now(),
          CASE WHEN $3::text = 'SUCCEEDED' THEN $5::timestamptz ELSE NULL END,
          CASE WHEN $3::text IN ('FAILED', 'DEAD_LETTERED') THEN $5::timestamptz ELSE NULL END,
          CASE WHEN $3::text = 'DEAD_LETTERED' THEN $5::timestamptz ELSE NULL END)`,
        [runId, deliveryId, input.status, attemptCount, at],
      );
      await manager.query(
        `INSERT INTO delivery_attempts (
          delivery_id, run_id, attempt_number, run_attempt_number,
          request_headers, response_status, response_headers,
          response_body_preview, duration_ms, started_at, completed_at
        ) VALUES ($1, $2, $3, $3, '{"authorization":"[REDACTED]"}',
          503, '{"set-cookie":"[REDACTED]"}', 'bounded preview', 25,
          $4, $4)`,
        [deliveryId, runId, attemptCount, at],
      );
    });
    return { deliveryId, runId };
  }

  it('lists safe current DLQ rows and isolates run/attempt history by workspace', async () => {
    const ownerToken = await registerAndLogin('dlq-owner');
    const otherToken = await registerAndLogin('dlq-other');
    const projectId = await createProject(ownerToken);
    const endpointId = await createEndpoint(projectId);
    const eventId = await createEvent(projectId);
    const older = await createDelivery({
      eventId,
      endpointId,
      status: 'DEAD_LETTERED',
      deadLetteredAt: new Date(Date.now() - 60_000),
    });
    const newer = await createDelivery({
      eventId,
      endpointId: await createEndpoint(projectId),
      status: 'DEAD_LETTERED',
      deadLetteredAt: new Date(),
    });

    const dlq = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/dlq?page=1&pageSize=1`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(dlq.body).toMatchObject({ total: 2, page: 1, pageSize: 1 });
    expect(dlq.body.items[0]).toMatchObject({
      deliveryId: newer.deliveryId,
      eventId,
      failureReason: 'HTTP_503',
      attemptCount: 1,
    });
    expect(JSON.stringify(dlq.body)).not.toMatch(
      /immutable|endpointUrl|current\.example|requestHeaders|responseHeaders|bounded preview/i,
    );

    const runs = await request(app.getHttpServer())
      .get(`/api/v1/deliveries/${older.deliveryId}/runs`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(runs.body).toHaveLength(1);
    expect(runs.body[0]).toMatchObject({
      id: older.runId,
      runNumber: 1,
      trigger: 'INITIAL',
      status: 'DEAD_LETTERED',
      requestedBy: null,
    });

    const attempts = await request(app.getHttpServer())
      .get(`/api/v1/deliveries/${older.deliveryId}/attempts`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(attempts.body[0]).toMatchObject({
      runId: older.runId,
      runNumber: 1,
      runTrigger: 'INITIAL',
      runAttemptNumber: 1,
    });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/dlq`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/api/v1/deliveries/${older.deliveryId}/runs`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
    await request(app.getHttpServer())
      .post(`/api/v1/deliveries/${older.deliveryId}/replay`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });

  it('replays a terminal delivery with current endpoint config and resumes one unpublished run', async () => {
    const token = await registerAndLogin('single-replay');
    const projectId = await createProject(token);
    const endpointId = await createEndpoint(
      projectId,
      true,
      'https://repaired.example.test/new-hook',
    );
    const eventId = await createEvent(projectId);
    const terminal = await createDelivery({
      eventId,
      endpointId,
      status: 'DEAD_LETTERED',
      attemptCount: 5,
    });

    const rotation = await request(app.getHttpServer())
      .post(`/api/v1/endpoints/${endpointId}/signing-secret/rotate`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    expect(rotation.body.version).toBe(2);
    const currentSigning = await dataSource.query(
      `SELECT signing_secret_encrypted AS encrypted
       FROM endpoints WHERE id = $1`,
      [endpointId],
    );

    const replay = await request(app.getHttpServer())
      .post(`/api/v1/deliveries/${terminal.deliveryId}/replay`)
      .set('Authorization', `Bearer ${token}`)
      .expect(202);
    expect(replay.body).toMatchObject({
      deliveryId: terminal.deliveryId,
      runNumber: 2,
      status: 'started',
    });
    const publishedJob = publish.mock.calls.at(-1)?.[2] as Record<string, unknown>;
    expect(publishedJob).toMatchObject({
      version: 4,
      runId: replay.body.runId,
      runNumber: 2,
      attemptNumber: 6,
      runAttemptNumber: 1,
      endpointUrl: 'https://repaired.example.test/new-hook',
      data: { invoiceId: 'immutable' },
      endpointSigningSecretEncrypted: currentSigning[0].encrypted,
      endpointSigningSecretVersion: 2,
    });
    expect(JSON.stringify(publishedJob)).not.toContain(rotation.body.signingSecret);
    await request(app.getHttpServer())
      .post(`/api/v1/deliveries/${terminal.deliveryId}/replay`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);

    const unpublished = await createDelivery({
      eventId: await createEvent(projectId),
      endpointId,
      status: 'FAILED',
    });
    publish.mockRejectedValueOnce(new Error('Kafka unavailable'));
    const failed = await request(app.getHttpServer())
      .post(`/api/v1/deliveries/${unpublished.deliveryId}/replay`)
      .set('Authorization', `Bearer ${token}`)
      .expect(503);
    const persistedRunId = failed.body.runId;
    publish.mockResolvedValue(undefined);
    const resumed = await request(app.getHttpServer())
      .post(`/api/v1/deliveries/${unpublished.deliveryId}/replay`)
      .set('Authorization', `Bearer ${token}`)
      .expect(202);
    expect(resumed.body).toMatchObject({
      runId: persistedRunId,
      runNumber: 2,
      status: 'resumed',
    });
    const runCount = await dataSource.query(
      `SELECT COUNT(*)::int AS count FROM delivery_runs WHERE delivery_id = $1`,
      [unpublished.deliveryId],
    );
    expect(runCount[0].count).toBe(2);

    const disabledEndpoint = await createEndpoint(projectId, false);
    const disabled = await createDelivery({
      eventId: await createEvent(projectId),
      endpointId: disabledEndpoint,
      status: 'FAILED',
    });
    await request(app.getHttpServer())
      .post(`/api/v1/deliveries/${disabled.deliveryId}/replay`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);

    const successful = await createDelivery({
      eventId: await createEvent(projectId),
      endpointId,
      status: 'SUCCEEDED',
    });
    const successfulReplay = await request(app.getHttpServer())
      .post(`/api/v1/deliveries/${successful.deliveryId}/replay`)
      .set('Authorization', `Bearer ${token}`)
      .expect(202);
    expect(successfulReplay.body).toMatchObject({
      deliveryId: successful.deliveryId,
      runNumber: 2,
      status: 'started',
    });
  });

  it('replays only eligible event deliveries and reports skips and publication failures', async () => {
    const token = await registerAndLogin('event-replay');
    const projectId = await createProject(token);
    const eventId = await createEvent(projectId);
    const enabledA = await createEndpoint(projectId);
    const enabledB = await createEndpoint(projectId);
    const disabled = await createEndpoint(projectId, false);
    const first = await createDelivery({
      eventId,
      endpointId: enabledA,
      status: 'DEAD_LETTERED',
    });
    const second = await createDelivery({
      eventId,
      endpointId: enabledB,
      status: 'FAILED',
    });
    const skipped = await createDelivery({
      eventId,
      endpointId: disabled,
      status: 'FAILED',
    });
    await createDelivery({
      eventId,
      endpointId: await createEndpoint(projectId),
      status: 'SUCCEEDED',
    });
    publish.mockImplementation(async (_topic, _key, message: any) => {
      if (message.deliveryId === second.deliveryId) {
        throw new Error('partition unavailable');
      }
    });

    const replay = await request(app.getHttpServer())
      .post(`/api/v1/events/${eventId}/replay`)
      .set('Authorization', `Bearer ${token}`)
      .expect(202);
    expect(replay.body.started.map((item: any) => item.deliveryId)).toEqual([
      first.deliveryId,
    ]);
    expect(replay.body.publicationFailed).toEqual([
      expect.objectContaining({
        deliveryId: second.deliveryId,
        reason: 'publication_failed',
      }),
    ]);
    expect(replay.body.skipped).toContainEqual({
      deliveryId: skipped.deliveryId,
      reason: 'endpoint_disabled',
    });
    const activeRuns = await dataSource.query(
      `SELECT delivery_id, COUNT(*)::int AS count FROM delivery_runs
       WHERE delivery_id = ANY($1::uuid[]) AND run_number = 2
       GROUP BY delivery_id ORDER BY delivery_id`,
      [[first.deliveryId, second.deliveryId]],
    );
    expect(activeRuns).toHaveLength(2);
    expect(activeRuns.every((row: any) => row.count === 1)).toBe(true);
  });
});
