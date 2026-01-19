import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import mysql from 'mysql2/promise';

export default async function globalSetup() {
	console.log('🚀 Creating test database...');

	// Load test environment for DB credentials
	dotenvConfig({ path: resolve(__dirname, '.env.test'), override: true });

	const TEST_DB_NAME = process.env.DB_NAME;

	// Create test database if it doesn't exist
	const connection = await mysql.createConnection({
		host: process.env.DB_HOST,
		port: parseInt(process.env.DB_PORT || '3306'),
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD
	});

	await connection.query(`CREATE DATABASE IF NOT EXISTS \`${TEST_DB_NAME}\``);
	await connection.end();

	console.log(`✅ Test database '${TEST_DB_NAME}' ready`);
}
