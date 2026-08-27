import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  encryptSigningSecret,
  generateSigningSecret,
  parseSigningEncryptionKey,
} from '@relayforge/webhook-signing';

export class AddEndpointSigningSecrets1787788800000
  implements MigrationInterface
{
  name = 'AddEndpointSigningSecrets1787788800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const encryptionKey = parseSigningEncryptionKey(
      process.env.SIGNING_SECRET_ENCRYPTION_KEY,
    );

    await queryRunner.query(
      `ALTER TABLE "endpoints" ADD "signing_secret_encrypted" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "endpoints" ADD "signing_secret_hash" character(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "endpoints" ADD "signing_secret_version" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "endpoints" ADD "signing_secret_rotated_at" TIMESTAMP WITH TIME ZONE`,
    );

    const endpoints: Array<{ id: string }> = await queryRunner.query(
      `SELECT "id" FROM "endpoints" ORDER BY "id"`,
    );
    for (const endpoint of endpoints) {
      const generated = generateSigningSecret();
      await queryRunner.query(
        `UPDATE "endpoints" SET
          "signing_secret_encrypted" = $2,
          "signing_secret_hash" = $3,
          "signing_secret_version" = 1,
          "signing_secret_rotated_at" = now()
        WHERE "id" = $1`,
        [
          endpoint.id,
          encryptSigningSecret(generated.secret, encryptionKey),
          generated.hash,
        ],
      );
    }

    const missing: Array<{ count: string }> = await queryRunner.query(
      `SELECT COUNT(*)::text AS "count" FROM "endpoints"
       WHERE "signing_secret_encrypted" IS NULL
          OR "signing_secret_hash" IS NULL
          OR "signing_secret_version" IS NULL
          OR "signing_secret_rotated_at" IS NULL`,
    );
    if (Number(missing[0]?.count ?? 0) !== 0) {
      throw new Error('Endpoint signing-secret backfill did not complete');
    }

    await queryRunner.query(
      `ALTER TABLE "endpoints" ALTER COLUMN "signing_secret_encrypted" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "endpoints" ALTER COLUMN "signing_secret_hash" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "endpoints" ALTER COLUMN "signing_secret_version" SET DEFAULT 1`,
    );
    await queryRunner.query(
      `ALTER TABLE "endpoints" ALTER COLUMN "signing_secret_version" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "endpoints" ALTER COLUMN "signing_secret_rotated_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "endpoints" ADD CONSTRAINT "CHK_endpoints_signing_secret_version_positive" CHECK ("signing_secret_version" > 0)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const endpoints: Array<{ count: string }> = await queryRunner.query(
      `SELECT COUNT(*)::text AS "count" FROM "endpoints"`,
    );
    if (
      Number(endpoints[0]?.count ?? 0) > 0 &&
      process.env.ALLOW_SIGNING_SECRET_SCHEMA_ROLLBACK !== 'true'
    ) {
      throw new Error(
        'Cannot remove endpoint signing material until v4 Kafka jobs have drained; set ALLOW_SIGNING_SECRET_SCHEMA_ROLLBACK=true only after verifying that condition',
      );
    }

    await queryRunner.query(
      `ALTER TABLE "endpoints" DROP CONSTRAINT "CHK_endpoints_signing_secret_version_positive"`,
    );
    await queryRunner.query(
      `ALTER TABLE "endpoints" DROP COLUMN "signing_secret_rotated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "endpoints" DROP COLUMN "signing_secret_version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "endpoints" DROP COLUMN "signing_secret_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "endpoints" DROP COLUMN "signing_secret_encrypted"`,
    );
  }
}
