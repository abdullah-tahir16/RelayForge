import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEndpointsAndSubscriptions1787008675508 implements MigrationInterface {
    name = 'AddEndpointsAndSubscriptions1787008675508'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "endpoints" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" uuid NOT NULL, "name" character varying NOT NULL, "url" character varying NOT NULL, "description" character varying, "enabled" boolean NOT NULL DEFAULT true, "timeout_ms" integer NOT NULL DEFAULT '10000', "disabled_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_70835610dfa54ad5d990e02f70a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f0503352feddfd78662f0981b2" ON "endpoints" ("project_id") `);
        await queryRunner.query(`ALTER TABLE "endpoints" ADD CONSTRAINT "FK_endpoints_project_id" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE TABLE "subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "endpoint_id" uuid NOT NULL, "event_pattern" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a5969944864c666b84864d7a9a" ON "subscriptions" ("endpoint_id") `);
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_subscriptions_endpoint_id" FOREIGN KEY ("endpoint_id") REFERENCES "endpoints"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_subscriptions_endpoint_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a5969944864c666b84864d7a9a"`);
        await queryRunner.query(`DROP TABLE "subscriptions"`);
        await queryRunner.query(`ALTER TABLE "endpoints" DROP CONSTRAINT "FK_endpoints_project_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f0503352feddfd78662f0981b2"`);
        await queryRunner.query(`DROP TABLE "endpoints"`);
    }

}
