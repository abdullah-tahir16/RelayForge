import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeadLetterQueueAndReplay1787529600000
  implements MigrationInterface
{
  name = 'AddDeadLetterQueueAndReplay1787529600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."deliveries_status_enum" RENAME TO "deliveries_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."deliveries_status_enum" AS ENUM('PENDING', 'PROCESSING', 'RETRYING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTERED')`,
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
      `CREATE TYPE "public"."delivery_runs_trigger_enum" AS ENUM('INITIAL', 'MANUAL')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."delivery_runs_status_enum" AS ENUM('PENDING', 'PROCESSING', 'RETRYING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTERED')`,
    );
    await queryRunner.query(`CREATE TABLE "delivery_runs" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "delivery_id" uuid NOT NULL,
      "run_number" integer NOT NULL,
      "trigger" "public"."delivery_runs_trigger_enum" NOT NULL,
      "requested_by_user_id" uuid,
      "status" "public"."delivery_runs_status_enum" NOT NULL DEFAULT 'PENDING',
      "attempt_limit" integer,
      "attempt_count" integer NOT NULL DEFAULT 0,
      "initial_job_published_at" TIMESTAMP WITH TIME ZONE,
      "dlq_published_at" TIMESTAMP WITH TIME ZONE,
      "started_at" TIMESTAMP WITH TIME ZONE,
      "completed_at" TIMESTAMP WITH TIME ZONE,
      "failed_at" TIMESTAMP WITH TIME ZONE,
      "dead_lettered_at" TIMESTAMP WITH TIME ZONE,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "PK_delivery_runs_id" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_delivery_runs_delivery_number" UNIQUE ("delivery_id", "run_number"),
      CONSTRAINT "CHK_delivery_runs_number_positive" CHECK ("run_number" > 0),
      CONSTRAINT "CHK_delivery_runs_attempt_limit_positive" CHECK ("attempt_limit" IS NULL OR "attempt_limit" > 0),
      CONSTRAINT "CHK_delivery_runs_attempt_count_nonnegative" CHECK ("attempt_count" >= 0)
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_delivery_runs_delivery_id" ON "delivery_runs" ("delivery_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_delivery_runs_one_active" ON "delivery_runs" ("delivery_id") WHERE "status" IN ('PENDING', 'PROCESSING', 'RETRYING')`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_runs" ADD CONSTRAINT "FK_delivery_runs_delivery_id" FOREIGN KEY ("delivery_id") REFERENCES "deliveries"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_runs" ADD CONSTRAINT "FK_delivery_runs_requested_by_user_id" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "deliveries" ADD "current_run_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "deliveries" ADD "dead_lettered_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_attempts" ADD "run_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_attempts" ADD "run_attempt_number" integer`,
    );

    await queryRunner.query(`INSERT INTO "delivery_runs" (
      "delivery_id", "run_number", "trigger", "status", "attempt_limit",
      "attempt_count", "initial_job_published_at", "started_at", "completed_at",
      "failed_at", "created_at", "updated_at"
    )
    SELECT
      d."id", 1, 'INITIAL', d."status"::text::"public"."delivery_runs_status_enum",
      GREATEST(5, d."attempt_count"), d."attempt_count", d."created_at",
      CASE WHEN d."attempt_count" > 0 OR d."status" IN ('PROCESSING', 'RETRYING') THEN d."created_at" ELSE NULL END,
      CASE WHEN d."status" = 'SUCCEEDED' THEN COALESCE(d."completed_at", d."updated_at") ELSE NULL END,
      CASE WHEN d."status" = 'FAILED' THEN COALESCE(d."failed_at", d."updated_at") ELSE NULL END,
      d."created_at", d."updated_at"
    FROM "deliveries" d`);
    await queryRunner.query(`UPDATE "deliveries" d
      SET "current_run_id" = r."id"
      FROM "delivery_runs" r
      WHERE r."delivery_id" = d."id" AND r."run_number" = 1`);
    await queryRunner.query(`UPDATE "delivery_attempts" a
      SET "run_id" = r."id", "run_attempt_number" = a."attempt_number"
      FROM "delivery_runs" r
      WHERE r."delivery_id" = a."delivery_id" AND r."run_number" = 1`);

    await queryRunner.query(
      `ALTER TABLE "deliveries" ALTER COLUMN "current_run_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_attempts" ALTER COLUMN "run_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_attempts" ALTER COLUMN "run_attempt_number" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_attempts" ADD CONSTRAINT "CHK_delivery_attempt_run_number_positive" CHECK ("run_attempt_number" > 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_attempts" ADD CONSTRAINT "UQ_delivery_attempts_run_number" UNIQUE ("run_id", "run_attempt_number")`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_attempts" ADD CONSTRAINT "FK_delivery_attempts_run_id" FOREIGN KEY ("run_id") REFERENCES "delivery_runs"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "deliveries" ADD CONSTRAINT "FK_deliveries_current_run_id" FOREIGN KEY ("current_run_id") REFERENCES "delivery_runs"("id") DEFERRABLE INITIALLY DEFERRED`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_deliveries_current_run_id" ON "deliveries" ("current_run_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_deliveries_dead_lettered_at" ON "deliveries" ("dead_lettered_at") WHERE "dead_lettered_at" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_delivery_attempts_run_id" ON "delivery_attempts" ("run_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Dropping this schema after a replay would irreversibly merge distinct
    // attempt budgets and actor history. Require an explicit export/maintenance
    // procedure instead of pretending that rollback is lossless.
    const replayRows: Array<{ count: string }> = await queryRunner.query(
      `SELECT COUNT(*)::text AS "count" FROM "delivery_runs" WHERE "trigger" = 'MANUAL' OR "run_number" > 1`,
    );
    if (Number(replayRows[0]?.count ?? 0) > 0) {
      throw new Error(
        'Cannot roll back dead-letter/replay schema after manual replay history exists',
      );
    }

    await queryRunner.query(
      `ALTER TABLE "deliveries" DROP CONSTRAINT "FK_deliveries_current_run_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_attempts" DROP CONSTRAINT "FK_delivery_attempts_run_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_attempts" DROP CONSTRAINT "UQ_delivery_attempts_run_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "delivery_attempts" DROP CONSTRAINT "CHK_delivery_attempt_run_number_positive"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_delivery_attempts_run_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_deliveries_dead_lettered_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_deliveries_current_run_id"`);
    await queryRunner.query(
      `ALTER TABLE "delivery_attempts" DROP COLUMN "run_attempt_number"`,
    );
    await queryRunner.query(`ALTER TABLE "delivery_attempts" DROP COLUMN "run_id"`);
    await queryRunner.query(
      `ALTER TABLE "deliveries" DROP COLUMN "dead_lettered_at"`,
    );
    await queryRunner.query(`ALTER TABLE "deliveries" DROP COLUMN "current_run_id"`);
    await queryRunner.query(`DROP TABLE "delivery_runs"`);
    await queryRunner.query(`DROP TYPE "public"."delivery_runs_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."delivery_runs_trigger_enum"`);

    await queryRunner.query(
      `UPDATE "deliveries" SET "status" = 'FAILED' WHERE "status" = 'DEAD_LETTERED'`,
    );
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
  }
}
