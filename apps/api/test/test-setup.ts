import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { Calculation } from '../src/modules/calculations/entities/calculation.entity';
import { Generation } from '../src/modules/generations/entities/generation.entity';
import { GenerationRequest } from '../src/modules/generations/entities/generation-request.entity';
import { Session } from '../src/modules/auth/entitites/session.entity';
import { User } from '../src/modules/auth/entitites/user.entity';
import mysql from 'mysql2/promise';

// Load test environment variables BEFORE any other imports
// This file should be first in jest setupFiles
dotenvConfig({ path: resolve(__dirname, '.env.test'), override: true });

// Set NODE_ENV to test for logger configuration
process.env.NODE_ENV = 'test';

const TEST_DB_NAME = process.env.DB_NAME;

/**
 * Initialize test database - creates DB and syncs schema
 */
async function initTestDatabase(): Promise<DataSource> {
	await createTestDatabaseIfNotExists();
	const dataSource = createTestDataSource();
	await dataSource.initialize();
	return dataSource;
}

/**
 * Creates the test database if it doesn't exist
 */
async function createTestDatabaseIfNotExists(): Promise<void> {
	const connection = await mysql.createConnection({
		host: process.env.DB_HOST,
		port: parseInt(process.env.DB_PORT || '3306'),
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD
	});

	await connection.query(`CREATE DATABASE IF NOT EXISTS \`${TEST_DB_NAME}\``);
	await connection.end();
}

/**
 * Creates a TypeORM DataSource for testing with synchronize: true
 */
function createTestDataSource(): DataSource {
	return new DataSource({
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
	createTestDatabaseIfNotExists,
	createTestDataSource,
	initTestDatabase,
	cleanupTables,
	TEST_DB_NAME
};
