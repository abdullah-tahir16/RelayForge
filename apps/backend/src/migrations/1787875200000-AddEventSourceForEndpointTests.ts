import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventSourceForEndpointTests1787875200000
  implements MigrationInterface
{
  name = 'AddEventSourceForEndpointTests1787875200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."events_source_enum" AS ENUM('CUSTOMER', 'ENDPOINT_TEST')`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" ADD "source" "public"."events_source_enum" NOT NULL DEFAULT 'CUSTOMER'`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" ADD "test_target_endpoint_id" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_events_test_target_endpoint_id" ON "events" ("test_target_endpoint_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" ADD CONSTRAINT "FK_events_test_target_endpoint_id" FOREIGN KEY ("test_target_endpoint_id") REFERENCES "endpoints"("id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "events" DROP CONSTRAINT "FK_events_test_target_endpoint_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_events_test_target_endpoint_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" DROP COLUMN "test_target_endpoint_id"`,
    );
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "source"`);
    await queryRunner.query(`DROP TYPE "public"."events_source_enum"`);
  }
}
