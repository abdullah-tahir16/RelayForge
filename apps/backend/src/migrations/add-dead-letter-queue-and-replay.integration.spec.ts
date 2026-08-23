import { DataSource, QueryRunner } from 'typeorm';
import { InitAuthSchema1786978044348 } from './1786978044348-InitAuthSchema';
import { AddProjectsAndApiKeys1786991535417 } from './1786991535417-AddProjectsAndApiKeys';
import { AddEndpointsAndSubscriptions1787008675508 } from './1787008675508-AddEndpointsAndSubscriptions';
import { AddEventsAndDeliveries1787011451398 } from './1787011451398-AddEventsAndDeliveries';
import { AddDeliveryHttpOutcome1787016703523 } from './1787016703523-AddDeliveryHttpOutcome';
import { AddDeliveryAttemptsAndRetries1787443200000 } from './1787443200000-AddDeliveryAttemptsAndRetries';
import { AddDeadLetterQueueAndReplay1787529600000 } from './1787529600000-AddDeadLetterQueueAndReplay';

const databaseUrl = process.env.TEST_DATABASE_URL;
const databaseDescribe = databaseUrl ? describe : describe.skip;

databaseDescribe('AddDeadLetterQueueAndReplay migration', () => {
  let dataSource: DataSource;
  let runner: QueryRunner;
  const migration = new AddDeadLetterQueueAndReplay1787529600000();

  beforeAll(async () => {
    dataSource = new DataSource({ type: 'postgres', url: databaseUrl });
    await dataSource.initialize();
    runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.query('DROP SCHEMA public CASCADE');
    await runner.query('CREATE SCHEMA public');
    await runner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    for (const previous of [
      new InitAuthSchema1786978044348(),
      new AddProjectsAndApiKeys1786991535417(),
      new AddEndpointsAndSubscriptions1787008675508(),
      new AddEventsAndDeliveries1787011451398(),
      new AddDeliveryHttpOutcome1787016703523(),
      new AddDeliveryAttemptsAndRetries1787443200000(),
    ]) {
      await previous.up(runner);
    }

    await seedLegacyDeliveryFixtures(runner);
  });

  afterAll(async () => {
    await runner?.release();
    await dataSource?.destroy();
  });

  it('backfills one initial run and preserves status and sparse attempt history', async () => {
    await migration.up(runner);

    const runs: Array<{
      deliveryId: string;
      runNumber: number;
      trigger: string;
      status: string;
      attemptLimit: number;
      attemptCount: number;
      dlqPublishedAt: Date | null;
    }> = await runner.query(`SELECT
      "delivery_id" AS "deliveryId", "run_number" AS "runNumber",
      "trigger", "status", "attempt_limit" AS "attemptLimit",
      "attempt_count" AS "attemptCount", "dlq_published_at" AS "dlqPublishedAt"
      FROM "delivery_runs" ORDER BY "delivery_id"`);

    expect(runs).toHaveLength(5);
    expect(runs.map((run) => run.trigger)).toEqual(Array(5).fill('INITIAL'));
    expect(runs.map((run) => run.runNumber)).toEqual(Array(5).fill(1));
    expect(runs.map((run) => run.status).sort()).toEqual(
      ['FAILED', 'PENDING', 'RETRYING', 'SUCCEEDED', 'SUCCEEDED'].sort(),
    );
    expect(runs.find((run) => run.deliveryId.endsWith('05'))).toMatchObject({
      attemptLimit: 6,
      attemptCount: 6,
      status: 'FAILED',
      dlqPublishedAt: null,
    });

    const attempts: Array<{
      deliveryId: string;
      attemptNumber: number;
      runAttemptNumber: number;
      runId: string;
      currentRunId: string;
    }> = await runner.query(`SELECT
      a."delivery_id" AS "deliveryId", a."attempt_number" AS "attemptNumber",
      a."run_attempt_number" AS "runAttemptNumber", a."run_id" AS "runId",
      d."current_run_id" AS "currentRunId"
      FROM "delivery_attempts" a
      JOIN "deliveries" d ON d."id" = a."delivery_id"
      ORDER BY a."delivery_id", a."attempt_number"`);
    expect(attempts).toHaveLength(6);
    for (const attempt of attempts) {
      expect(attempt.runId).toBe(attempt.currentRunId);
      expect(attempt.runAttemptNumber).toBe(attempt.attemptNumber);
    }
  });

  it('rolls down before replay history and refuses destructive rollback afterward', async () => {
    await migration.down(runner);
    const removedColumns: Array<{ count: string }> = await runner.query(`SELECT COUNT(*)::text AS "count"
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'deliveries'
        AND column_name IN ('current_run_id', 'dead_lettered_at')`);
    expect(removedColumns[0].count).toBe('0');

    await migration.up(runner);
    await runner.query(`INSERT INTO "delivery_runs" (
      "delivery_id", "run_number", "trigger", "status"
    ) VALUES ('00000000-0000-0000-0000-000000000003', 2, 'MANUAL', 'PENDING')`);

    await expect(migration.down(runner)).rejects.toThrow(
      'Cannot roll back dead-letter/replay schema after manual replay history exists',
    );
    const retained: Array<{ count: string }> = await runner.query(
      `SELECT COUNT(*)::text AS "count" FROM "delivery_runs" WHERE "trigger" = 'MANUAL'`,
    );
    expect(retained[0].count).toBe('1');
  });
});

async function seedLegacyDeliveryFixtures(runner: QueryRunner): Promise<void> {
  await runner.query(`INSERT INTO "users" ("id", "email", "password_hash")
    VALUES ('10000000-0000-0000-0000-000000000001', 'migration@example.test', 'hash')`);
  await runner.query(`INSERT INTO "workspaces" ("id", "owner_user_id", "name")
    VALUES ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Migration')`);
  await runner.query(`INSERT INTO "projects" ("id", "workspace_id", "name", "key")
    VALUES ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Migration', 'migration')`);
  await runner.query(`INSERT INTO "events" ("id", "project_id", "event_type", "payload", "status")
    VALUES ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'migration.test', '{}', 'PROCESSING')`);

  for (let index = 1; index <= 5; index += 1) {
    const id = `50000000-0000-0000-0000-00000000000${index}`;
    await runner.query(
      `INSERT INTO "endpoints" ("id", "project_id", "name", "url") VALUES ($1, '30000000-0000-0000-0000-000000000001', $2, $3)`,
      [id, `Endpoint ${index}`, `https://example.test/${index}`],
    );
  }

  const fixtures = [
    ['00000000-0000-0000-0000-000000000001', 1, 'PENDING', 0],
    ['00000000-0000-0000-0000-000000000002', 2, 'RETRYING', 1],
    ['00000000-0000-0000-0000-000000000003', 3, 'SUCCEEDED', 1],
    ['00000000-0000-0000-0000-000000000004', 4, 'SUCCEEDED', 3],
    ['00000000-0000-0000-0000-000000000005', 5, 'FAILED', 6],
  ] as const;
  for (const [deliveryId, endpointIndex, status, attemptCount] of fixtures) {
    await runner.query(
      `INSERT INTO "deliveries" (
        "id", "event_id", "endpoint_id", "status", "attempt_count",
        "completed_at", "failed_at", "next_attempt_at"
      ) VALUES ($1, '40000000-0000-0000-0000-000000000001', $2,
        $3::text::"public"."deliveries_status_enum", $4,
        CASE WHEN $3::text = 'SUCCEEDED' THEN now() ELSE NULL END,
        CASE WHEN $3::text = 'FAILED' THEN now() ELSE NULL END,
        CASE WHEN $3::text = 'RETRYING' THEN now() ELSE NULL END)`,
      [
        deliveryId,
        `50000000-0000-0000-0000-00000000000${endpointIndex}`,
        status,
        attemptCount,
      ],
    );
  }

  for (const [deliveryId, attemptNumbers] of [
    ['00000000-0000-0000-0000-000000000002', [1]],
    ['00000000-0000-0000-0000-000000000003', [1]],
    ['00000000-0000-0000-0000-000000000004', [1, 3]],
    ['00000000-0000-0000-0000-000000000005', [1, 6]],
  ] as const) {
    for (const attemptNumber of attemptNumbers) {
      await runner.query(
        `INSERT INTO "delivery_attempts" (
          "delivery_id", "attempt_number", "started_at", "completed_at"
        ) VALUES ($1, $2, now(), now())`,
        [deliveryId, attemptNumber],
      );
    }
  }
}
