import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1772010125891 implements MigrationInterface {
    name = 'Migration1772010125891'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`output\``);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`output\` longtext NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`output\``);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`output\` text NULL`);
    }

}
