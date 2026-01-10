import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1768037763333 implements MigrationInterface {
    name = 'Migration1768037763333'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`idx_hostname\` ON \`generations\``);
        await queryRunner.query(`DROP INDEX \`unique_generation\` ON \`generations\``);
        await queryRunner.query(`ALTER TABLE \`generations\` DROP COLUMN \`hostname\``);
        await queryRunner.query(`ALTER TABLE \`generations\` DROP FOREIGN KEY \`FK_e8fc0ba85a315c9f066c6dd7d14\``);
        await queryRunner.query(`ALTER TABLE \`generations\` CHANGE \`calculation_id\` \`calculation_id\` int UNSIGNED NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`unique_generation\` ON \`generations\` (\`calculation_id\`, \`provider\`)`);
        await queryRunner.query(`ALTER TABLE \`generations\` ADD CONSTRAINT \`FK_e8fc0ba85a315c9f066c6dd7d14\` FOREIGN KEY (\`calculation_id\`) REFERENCES \`calculations\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`generations\` DROP FOREIGN KEY \`FK_e8fc0ba85a315c9f066c6dd7d14\``);
        await queryRunner.query(`DROP INDEX \`unique_generation\` ON \`generations\``);
        await queryRunner.query(`ALTER TABLE \`generations\` CHANGE \`calculation_id\` \`calculation_id\` int UNSIGNED NULL`);
        await queryRunner.query(`ALTER TABLE \`generations\` ADD CONSTRAINT \`FK_e8fc0ba85a315c9f066c6dd7d14\` FOREIGN KEY (\`calculation_id\`) REFERENCES \`calculations\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`generations\` ADD \`hostname\` varchar(500) NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`unique_generation\` ON \`generations\` (\`hostname\`, \`provider\`)`);
        await queryRunner.query(`CREATE INDEX \`idx_hostname\` ON \`generations\` (\`hostname\`)`);
    }

}
