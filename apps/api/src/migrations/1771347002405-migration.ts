import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1771347002405 implements MigrationInterface {
    name = 'Migration1771347002405'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`deletedAt\` datetime(6) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`deletedAt\``);
    }

}
