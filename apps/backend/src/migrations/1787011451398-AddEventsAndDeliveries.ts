import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEventsAndDeliveries1787011451398 implements MigrationInterface {
    name = 'AddEventsAndDeliveries1787011451398'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."events_status_enum" AS ENUM('ACCEPTED', 'PUBLISHED', 'PROCESSING', 'COMPLETED', 'PARTIALLY_FAILED', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" uuid NOT NULL, "event_type" character varying NOT NULL, "payload" jsonb NOT NULL, "metadata" jsonb, "status" "public"."events_status_enum" NOT NULL DEFAULT 'ACCEPTED', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "published_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_events_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_events_project_id" ON "events" ("project_id") `);
        await queryRunner.query(`ALTER TABLE "events" ADD CONSTRAINT "FK_events_project_id" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        await queryRunner.query(`CREATE TYPE "public"."deliveries_status_enum" AS ENUM('PENDING', 'SUCCEEDED', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "deliveries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "event_id" uuid NOT NULL, "endpoint_id" uuid NOT NULL, "status" "public"."deliveries_status_enum" NOT NULL DEFAULT 'PENDING', "attempt_count" integer NOT NULL DEFAULT '0', "completed_at" TIMESTAMP WITH TIME ZONE, "failed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_deliveries_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_deliveries_event_id" ON "deliveries" ("event_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_deliveries_endpoint_id" ON "deliveries" ("endpoint_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_deliveries_event_endpoint" ON "deliveries" ("event_id", "endpoint_id") `);
        await queryRunner.query(`ALTER TABLE "deliveries" ADD CONSTRAINT "FK_deliveries_event_id" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "deliveries" ADD CONSTRAINT "FK_deliveries_endpoint_id" FOREIGN KEY ("endpoint_id") REFERENCES "endpoints"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "deliveries" DROP CONSTRAINT "FK_deliveries_endpoint_id"`);
        await queryRunner.query(`ALTER TABLE "deliveries" DROP CONSTRAINT "FK_deliveries_event_id"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_deliveries_event_endpoint"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_deliveries_endpoint_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_deliveries_event_id"`);
        await queryRunner.query(`DROP TABLE "deliveries"`);
        await queryRunner.query(`DROP TYPE "public"."deliveries_status_enum"`);

        await queryRunner.query(`ALTER TABLE "events" DROP CONSTRAINT "FK_events_project_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_events_project_id"`);
        await queryRunner.query(`DROP TABLE "events"`);
        await queryRunner.query(`DROP TYPE "public"."events_status_enum"`);
    }

}
