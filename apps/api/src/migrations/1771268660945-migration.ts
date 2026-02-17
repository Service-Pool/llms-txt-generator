import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1771268660945 implements MigrationInterface {
    name = 'Migration1771268660945'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`orders\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NULL, \`sessionId\` varchar(255) NULL, \`hostname\` varchar(255) NOT NULL, \`modelId\` varchar(255) NULL, \`priceTotal\` decimal(11,6) NULL, \`priceCurrency\` enum ('EUR') NULL, \`pricePerUrl\` decimal(11,6) NULL, \`stripeSessionId\` varchar(255) NULL, \`stripePaymentIntentSecret\` varchar(255) NULL, \`status\` enum ('created', 'calculated', 'pending_payment', 'paid', 'payment_failed', 'queued', 'processing', 'completed', 'failed', 'cancelled', 'refunded') NOT NULL DEFAULT 'created', \`jobId\` varchar(255) NULL, \`totalUrls\` int NULL, \`processedUrls\` int NOT NULL DEFAULT '0', \`startedAt\` datetime NULL, \`completedAt\` datetime NULL, \`output\` text NULL, \`errors\` json NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`users\` (\`id\` int NOT NULL AUTO_INCREMENT, \`email\` varchar(255) NOT NULL, \`loginToken\` varchar(255) NULL, \`loginTokenExpiresAt\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`sessions\` (\`id\` int NOT NULL AUTO_INCREMENT, \`sessionId\` varchar(255) NOT NULL, \`userId\` int NULL, \`data\` json NOT NULL, \`expiresAt\` datetime NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime NOT NULL, UNIQUE INDEX \`IDX_ba57f8421edf5e5c4e99b83381\` (\`sessionId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD CONSTRAINT \`FK_151b79a83ba240b0cb31b2302d1\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`sessions\` ADD CONSTRAINT \`FK_57de40bc620f456c7311aa3a1e6\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`sessions\` DROP FOREIGN KEY \`FK_57de40bc620f456c7311aa3a1e6\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP FOREIGN KEY \`FK_151b79a83ba240b0cb31b2302d1\``);
        await queryRunner.query(`DROP INDEX \`IDX_ba57f8421edf5e5c4e99b83381\` ON \`sessions\``);
        await queryRunner.query(`DROP TABLE \`sessions\``);
        await queryRunner.query(`DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``);
        await queryRunner.query(`DROP TABLE \`users\``);
        await queryRunner.query(`DROP TABLE \`orders\``);
    }

}
