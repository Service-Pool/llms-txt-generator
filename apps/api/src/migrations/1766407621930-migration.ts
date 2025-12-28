import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1766407621930 implements MigrationInterface {
    name = 'Migration1766407621930'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`users\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`username\` varchar(255) NOT NULL, \`email\` varchar(255) NULL, \`password\` varchar(255) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_fe0bb3f6520ee0469504521e71\` (\`username\`), UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`generation_requests\` (\`id\` int NOT NULL AUTO_INCREMENT, \`generation_id\` int UNSIGNED NOT NULL, \`user_id\` int UNSIGNED NULL, \`session_id\` varchar(128) NULL, \`requested_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`idx_generation\` (\`generation_id\`), INDEX \`idx_user\` (\`user_id\`), INDEX \`idx_session\` (\`session_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`generations\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`hostname\` varchar(500) NOT NULL, \`provider\` enum ('gemini', 'ollama') NOT NULL, \`status\` enum ('waiting', 'active', 'completed', 'failed') NOT NULL DEFAULT 'waiting', \`content\` longtext NULL, \`error_message\` text NULL, \`entries_count\` int UNSIGNED NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`idx_hostname\` (\`hostname\`), UNIQUE INDEX \`unique_generation\` (\`hostname\`, \`provider\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`sessions\` (\`sid\` varchar(128) NOT NULL, \`sess\` text NOT NULL, \`expire\` timestamp NOT NULL, INDEX \`IDX_e5d612f5400fecdea71f98ad6c\` (\`expire\`), PRIMARY KEY (\`sid\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`generation_requests\` ADD CONSTRAINT \`FK_9fa684f2f068e2fe6f6e0987c8d\` FOREIGN KEY (\`generation_id\`) REFERENCES \`generations\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`generation_requests\` ADD CONSTRAINT \`FK_3864f853d29f158206c5842ac0f\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`generation_requests\` DROP FOREIGN KEY \`FK_3864f853d29f158206c5842ac0f\``);
        await queryRunner.query(`ALTER TABLE \`generation_requests\` DROP FOREIGN KEY \`FK_9fa684f2f068e2fe6f6e0987c8d\``);
        await queryRunner.query(`DROP INDEX \`IDX_e5d612f5400fecdea71f98ad6c\` ON \`sessions\``);
        await queryRunner.query(`DROP TABLE \`sessions\``);
        await queryRunner.query(`DROP INDEX \`unique_generation\` ON \`generations\``);
        await queryRunner.query(`DROP INDEX \`idx_hostname\` ON \`generations\``);
        await queryRunner.query(`DROP TABLE \`generations\``);
        await queryRunner.query(`DROP INDEX \`idx_session\` ON \`generation_requests\``);
        await queryRunner.query(`DROP INDEX \`idx_user\` ON \`generation_requests\``);
        await queryRunner.query(`DROP INDEX \`idx_generation\` ON \`generation_requests\``);
        await queryRunner.query(`DROP TABLE \`generation_requests\``);
        await queryRunner.query(`DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``);
        await queryRunner.query(`DROP INDEX \`IDX_fe0bb3f6520ee0469504521e71\` ON \`users\``);
        await queryRunner.query(`DROP TABLE \`users\``);
    }

}
