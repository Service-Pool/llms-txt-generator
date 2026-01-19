import { Calculation } from '../src/modules/calculations/entities/calculation.entity';
import { config as dotenvConfig } from 'dotenv';
import { DataSource } from 'typeorm';
import { Generation } from '../src/modules/generations/entities/generation.entity';
import { GenerationRequest } from '../src/modules/generations/entities/generation-request.entity';
import { resolve } from 'path';
import { Session } from '../src/modules/auth/entitites/session.entity';
import { User } from '../src/modules/auth/entitites/user.entity';

// Load test environment variables BEFORE any other imports
// This file should be first in jest setupFiles
dotenvConfig({ path: resolve(__dirname, '.env.test'), override: true });

// Set NODE_ENV to test for logger configuration
process.env.NODE_ENV = 'test';

const TEST_DB_NAME = process.env.DB_NAME;

/**
 * Initialize test database connection (DB already created in globalSetup)
 */
async function initTestDatabase(): Promise<DataSource> {
	const dataSource = new DataSource({
		type: 'mysql',
		host: process.env.DB_HOST,
		port: parseInt(process.env.DB_PORT || '3306'),
		username: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: TEST_DB_NAME,
		entities: [Calculation, Generation, GenerationRequest, Session, User],
		synchronize: true, // Auto-create tables for tests
		dropSchema: false // Keep schema between test runs
	});

	await dataSource.initialize();
	return dataSource;
}

/**
 * Clean up specific tables before tests
 */
async function cleanupTables(dataSource: DataSource, tableNames: string[]): Promise<void> {
	for (const tableName of tableNames) {
		await dataSource.query(`DELETE FROM \`${tableName}\``);
	}
}

export {
	initTestDatabase,
	cleanupTables,
	TEST_DB_NAME
};
