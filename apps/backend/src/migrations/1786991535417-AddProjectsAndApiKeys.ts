import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProjectsAndApiKeys1786991535417 implements MigrationInterface {
    name = 'AddProjectsAndApiKeys1786991535417'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "workspace_id" uuid NOT NULL, "name" character varying NOT NULL, "key" character varying NOT NULL, "description" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_af78b8fc6857fe0a10d1bb1699" ON "projects" ("workspace_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a3c9187ed74e8dff082dcf95f8" ON "projects" ("workspace_id", "key") `);
        await queryRunner.query(`CREATE TABLE "api_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" uuid NOT NULL, "name" character varying NOT NULL, "key_hash" character varying NOT NULL, "key_prefix" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "last_used_at" TIMESTAMP WITH TIME ZONE, "revoked_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_57384430aa1959f4578046c9b81" UNIQUE ("key_hash"), CONSTRAINT "PK_5c8a79801b44bd27b79228e1dad" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f5de07dbb229225e2be643ff3d" ON "api_keys" ("project_id") `);
        await queryRunner.query(`ALTER TABLE "api_keys" ADD CONSTRAINT "FK_api_keys_project_id" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "api_keys" DROP CONSTRAINT "FK_api_keys_project_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f5de07dbb229225e2be643ff3d"`);
        await queryRunner.query(`DROP TABLE "api_keys"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a3c9187ed74e8dff082dcf95f8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_af78b8fc6857fe0a10d1bb1699"`);
        await queryRunner.query(`DROP TABLE "projects"`);
    }

}
