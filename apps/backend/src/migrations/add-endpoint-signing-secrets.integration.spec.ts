import { DataSource, QueryRunner } from 'typeorm';
import {
  decryptSigningSecret,
  hashSigningSecret,
  parseSigningEncryptionKey,
} from '@relayforge/webhook-signing';
import { InitAuthSchema1786978044348 } from './1786978044348-InitAuthSchema';
import { AddProjectsAndApiKeys1786991535417 } from './1786991535417-AddProjectsAndApiKeys';
import { AddEndpointsAndSubscriptions1787008675508 } from './1787008675508-AddEndpointsAndSubscriptions';
import { AddEventsAndDeliveries1787011451398 } from './1787011451398-AddEventsAndDeliveries';
import { AddDeliveryHttpOutcome1787016703523 } from './1787016703523-AddDeliveryHttpOutcome';
import { AddDeliveryAttemptsAndRetries1787443200000 } from './1787443200000-AddDeliveryAttemptsAndRetries';
import { AddDeadLetterQueueAndReplay1787529600000 } from './1787529600000-AddDeadLetterQueueAndReplay';
import { AddEndpointSigningSecrets1787788800000 } from './1787788800000-AddEndpointSigningSecrets';

const databaseUrl = process.env.TEST_DATABASE_URL;
const databaseDescribe = databaseUrl ? describe : describe.skip;
const TEST_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

databaseDescribe('AddEndpointSigningSecrets migration', () => {
  let dataSource: DataSource;
  let runner: QueryRunner;
  const migration = new AddEndpointSigningSecrets1787788800000();
  const originalKey = process.env.SIGNING_SECRET_ENCRYPTION_KEY;
  const originalRollback = process.env.ALLOW_SIGNING_SECRET_SCHEMA_ROLLBACK;

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
      new AddDeadLetterQueueAndReplay1787529600000(),
    ]) {
      await previous.up(runner);
    }
    await seedEndpoints(runner);
  });

  afterAll(async () => {
    if (originalKey === undefined) delete process.env.SIGNING_SECRET_ENCRYPTION_KEY;
    else process.env.SIGNING_SECRET_ENCRYPTION_KEY = originalKey;
    if (originalRollback === undefined) delete process.env.ALLOW_SIGNING_SECRET_SCHEMA_ROLLBACK;
    else process.env.ALLOW_SIGNING_SECRET_SCHEMA_ROLLBACK = originalRollback;
    await runner?.release();
    await dataSource?.destroy();
  });

  it('fails before schema mutation when the encryption key is missing', async () => {
    delete process.env.SIGNING_SECRET_ENCRYPTION_KEY;
    await expect(migration.up(runner)).rejects.toThrow(
      'SIGNING_SECRET_ENCRYPTION_KEY must be canonical base64 for exactly 32 bytes',
    );
    const columns: Array<{ count: string }> = await runner.query(
      `SELECT COUNT(*)::text AS "count" FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'endpoints'
         AND column_name LIKE 'signing_secret_%'`,
    );
    expect(columns[0].count).toBe('0');
  });

  it('backfills unique decryptable secrets and enforces the schema invariant', async () => {
    process.env.SIGNING_SECRET_ENCRYPTION_KEY = TEST_KEY;
    await migration.up(runner);
    const rows: Array<{
      encrypted: string;
      hash: string;
      version: number;
      rotatedAt: Date;
    }> = await runner.query(`SELECT
      "signing_secret_encrypted" AS "encrypted",
      "signing_secret_hash" AS "hash",
      "signing_secret_version" AS "version",
      "signing_secret_rotated_at" AS "rotatedAt"
      FROM "endpoints" ORDER BY "id"`);
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map(({ encrypted }) => encrypted)).size).toBe(2);
    expect(new Set(rows.map(({ hash }) => hash)).size).toBe(2);
    const key = parseSigningEncryptionKey(TEST_KEY);
    for (const row of rows) {
      const secret = decryptSigningSecret(row.encrypted, key);
      expect(secret).toMatch(/^rfs_[A-Za-z0-9_-]{43}$/);
      expect(row.hash).toBe(hashSigningSecret(secret));
      expect(row.version).toBe(1);
      expect(row.rotatedAt).toBeInstanceOf(Date);
    }
    await expect(
      runner.query(`INSERT INTO "endpoints" (
        "project_id", "name", "url", "signing_secret_rotated_at"
      ) VALUES ('30000000-0000-0000-0000-000000000001', 'Missing', 'https://example.test/missing', now())`),
    ).rejects.toThrow();
  });

  it('guards destructive rollback until v4 work is explicitly drained', async () => {
    delete process.env.ALLOW_SIGNING_SECRET_SCHEMA_ROLLBACK;
    await expect(migration.down(runner)).rejects.toThrow(
      'Cannot remove endpoint signing material until v4 Kafka jobs have drained',
    );
    process.env.ALLOW_SIGNING_SECRET_SCHEMA_ROLLBACK = 'true';
    await migration.down(runner);
    const columns: Array<{ count: string }> = await runner.query(
      `SELECT COUNT(*)::text AS "count" FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'endpoints'
         AND column_name LIKE 'signing_secret_%'`,
    );
    expect(columns[0].count).toBe('0');
  });
});

async function seedEndpoints(runner: QueryRunner): Promise<void> {
  await runner.query(`INSERT INTO "users" ("id", "email", "password_hash")
    VALUES ('10000000-0000-0000-0000-000000000001', 'signing@example.test', 'hash')`);
  await runner.query(`INSERT INTO "workspaces" ("id", "owner_user_id", "name")
    VALUES ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Signing')`);
  await runner.query(`INSERT INTO "projects" ("id", "workspace_id", "name", "key")
    VALUES ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Signing', 'signing')`);
  await runner.query(`INSERT INTO "endpoints" ("id", "project_id", "name", "url") VALUES
    ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'One', 'https://example.test/one'),
    ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'Two', 'https://example.test/two')`);
}
