import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1776106748953 implements MigrationInterface {
    name = 'AddOrderStrategy1776106748953'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`strategy\` enum ('flat', 'clustered') NOT NULL DEFAULT 'flat' AFTER \`modelId\``);
        await queryRunner.query(`ALTER TABLE \`orders\` ALTER COLUMN \`strategy\` DROP DEFAULT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`strategy\``);
    }

}
