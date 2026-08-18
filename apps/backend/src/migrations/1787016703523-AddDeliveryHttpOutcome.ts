import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDeliveryHttpOutcome1787016703523 implements MigrationInterface {
    name = 'AddDeliveryHttpOutcome1787016703523'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "deliveries" ADD "http_status_code" integer`);
        await queryRunner.query(`ALTER TABLE "deliveries" ADD "duration_ms" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "deliveries" DROP COLUMN "duration_ms"`);
        await queryRunner.query(`ALTER TABLE "deliveries" DROP COLUMN "http_status_code"`);
    }

}
