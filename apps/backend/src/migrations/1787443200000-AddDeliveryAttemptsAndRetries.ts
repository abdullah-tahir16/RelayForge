import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeliveryAttemptsAndRetries1787443200000
  implements MigrationInterface
{
  name = 'AddDeliveryAttemptsAndRetries1787443200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."deliveries_status_enum" RENAME TO "deliveries_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."deliveries_status_enum" AS ENUM('PENDING', 'PROCESSING', 'RETRYING', 'SUCCEEDED', 'FAILED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "deliveries" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "deliveries" ALTER COLUMN "status" TYPE "public"."deliveries_status_enum" USING "status"::text::"public"."deliveries_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deliveries" ALTER COLUMN "status" SET DEFAULT 'PENDING'`,
    );
    await queryRunner.query(`DROP TYPE "public"."deliveries_status_enum_old"`);

    await queryRunner.query(
      `ALTER TABLE "deliveries" ADD "next_attempt_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "deliveries" ADD "processing_token" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "deliveries" ADD "processing_expires_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_deliveries_next_attempt_at" ON "deliveries" ("next_attempt_at") WHERE "next_attempt_at" IS NOT NULL`,
    );

    await queryRunner.query(`CREATE TABLE "delivery_attempts" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "delivery_id" uuid NOT NULL,
      "attempt_number" integer NOT NULL,
      "request_headers" jsonb,
      "response_status" integer,
      "response_headers" jsonb,
      "response_body_preview" text,
      "duration_ms" integer,
      "error_code" character varying,
      "error_message" text,
      "started_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "completed_at" TIMESTAMP WITH TIME ZONE,
      CONSTRAINT "PK_delivery_attempts_id" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_delivery_attempts_delivery_number" UNIQUE ("delivery_id", "attempt_number"),
      CONSTRAINT "CHK_delivery_attempt_number_positive" CHECK ("attempt_number" > 0)
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_delivery_attempts_delivery_id" ON "delivery_attempts" ("delivery_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_attempts" ADD CONSTRAINT "FK_delivery_attempts_delivery_id" FOREIGN KEY ("delivery_id") REFERENCES "deliveries"("id") ON DELETE CASCADE`,
    );

    await queryRunner.query(`INSERT INTO "delivery_attempts" (
      "delivery_id", "attempt_number", "response_status", "duration_ms", "started_at", "completed_at"
    )
    SELECT "id", 1, "http_status_code", "duration_ms", "created_at", "updated_at"
    FROM "deliveries"
    WHERE "attempt_count" > 0
    ON CONFLICT DO NOTHING`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "delivery_attempts"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_deliveries_next_attempt_at"`);
    await queryRunner.query(
      `ALTER TABLE "deliveries" DROP COLUMN "processing_expires_at"`,
    );
    await queryRunner.query(`ALTER TABLE "deliveries" DROP COLUMN "processing_token"`);
    await queryRunner.query(`ALTER TABLE "deliveries" DROP COLUMN "next_attempt_at"`);
    await queryRunner.query(
      `UPDATE "deliveries" SET "status" = 'PENDING' WHERE "status" IN ('PROCESSING', 'RETRYING')`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."deliveries_status_enum" RENAME TO "deliveries_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."deliveries_status_enum" AS ENUM('PENDING', 'SUCCEEDED', 'FAILED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "deliveries" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "deliveries" ALTER COLUMN "status" TYPE "public"."deliveries_status_enum" USING "status"::text::"public"."deliveries_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deliveries" ALTER COLUMN "status" SET DEFAULT 'PENDING'`,
    );
    await queryRunner.query(`DROP TYPE "public"."deliveries_status_enum_old"`);
  }
}
