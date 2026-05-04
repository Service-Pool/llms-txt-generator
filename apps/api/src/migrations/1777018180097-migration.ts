import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1777018180097 implements MigrationInterface {
    name = 'Migration1777018180097'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`orders\` CHANGE \`processedUrls\` \`progress\` int NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`progress\``);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`progress\` json NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`progress\``);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`progress\` int NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`orders\` CHANGE \`progress\` \`processedUrls\` int NOT NULL DEFAULT '0'`);
    }

}
