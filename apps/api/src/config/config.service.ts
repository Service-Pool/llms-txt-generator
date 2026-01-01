import { config as dotenvConfig } from 'dotenv';
import { DataSource } from 'typeorm';
import { Generation } from '../modules/generations/entities/generation.entity';
import { GenerationRequest } from '../modules/generations/entities/generation-request.entity';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Provider } from '../enums/provider.enum';
import { Session } from '../modules/auth/entitites/session.entity';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../modules/auth/entitites/user.entity';
import * as Joi from 'joi';

dotenvConfig();

interface ValidatedEnv {
	DB_HOST: string;
	DB_NAME: string;
	DB_PASSWORD: string;
	DB_PORT: number;
	DB_USER: string;
	REDIS_HOST: string;
	REDIS_PORT: number;
	SUMMARY_CACHE_TTL: number;
	OLLAMA_HOST: string;
	OLLAMA_PORT: number;
	OLLAMA_MAX_TOKENS: number;
	OLLAMA_MODEL: string;
	OLLAMA_TEMPERATURE: number;
	GEMINI_API_KEY: string;
	GEMINI_MODEL: string;
	GEMINI_TEMPERATURE: number;
	GEMINI_MAX_TOKENS: number;
	SESSION_COOKIE_NAME: string;
	SESSION_MAX_AGE: number;
	SESSION_SECRET: string;
	CORS_ORIGIN: string;
	SOCKET_PATH: string;
}

interface ProviderConfig {
	queueName: string;
	pricePerGeneration: number;
	enabled: boolean;
	batchSize: number;
}

const validationSchema = Joi.object<ValidatedEnv>({
	DB_HOST: Joi.string().required(),
	DB_NAME: Joi.string().required(),
	DB_PASSWORD: Joi.string().required(),
	DB_PORT: Joi.number().port().required(),
	DB_USER: Joi.string().required(),
	REDIS_HOST: Joi.string().required(),
	REDIS_PORT: Joi.number().port().required(),
	SUMMARY_CACHE_TTL: Joi.number().integer().min(60),
	OLLAMA_HOST: Joi.string(),
	OLLAMA_PORT: Joi.number(),
	OLLAMA_MODEL: Joi.string(),
	OLLAMA_TEMPERATURE: Joi.number(),
	OLLAMA_MAX_TOKENS: Joi.number(),
	GEMINI_API_KEY: Joi.string(),
	GEMINI_MODEL: Joi.string(),
	GEMINI_TEMPERATURE: Joi.number(),
	GEMINI_MAX_TOKENS: Joi.number(),
	SESSION_COOKIE_NAME: Joi.string().required(),
	SESSION_MAX_AGE: Joi.number().required(),
	SESSION_SECRET: Joi.string().required(),
	CORS_ORIGIN: Joi.string().allow('').required(),
	SOCKET_PATH: Joi.string()
});

const PROVIDERS: Record<Provider, ProviderConfig> = {
	[Provider.GEMINI]: {
		queueName: 'gemini-queue',
		pricePerGeneration: 0,
		enabled: true,
		batchSize: 50
	},
	[Provider.OLLAMA]: {
		queueName: 'ollama-queue',
		pricePerGeneration: 0,
		enabled: true,
		batchSize: 2
	}
};

function validateEnv(): ValidatedEnv {
	const result = validationSchema.validate(process.env, {
		allowUnknown: true,
		abortEarly: false
	});

	if (result.error) {
		throw new InternalServerErrorException(`Config validation error (Joi): ${result.error.message}`);
	}

	return result.value;
}

const env = validateEnv();

// Validation constants
const HOSTNAME_VALIDATION = {
	regex: /^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
	message: 'Hostname must be a valid domain with protocol (http:// or https://) without path, query or trailing slash'
};

@Injectable()
class AppConfigService {
	// Generic database connection config (для pg-boss, session store, etc.)
	public readonly database = {
		host: env.DB_HOST,
		port: env.DB_PORT,
		user: env.DB_USER,
		password: env.DB_PASSWORD,
		database: env.DB_NAME
	};

	// Redis config
	public readonly redis = {
		host: env.REDIS_HOST,
		port: env.REDIS_PORT
	};

	// Cache config
	public readonly cache = {
		summaryCacheTtl: env.SUMMARY_CACHE_TTL
	};

	// TypeORM-specific config
	public readonly typeorm: TypeOrmModuleOptions = {
		type: 'mysql',
		host: this.database.host,
		port: this.database.port,
		username: this.database.user,
		password: this.database.password,
		database: this.database.database,
		synchronize: false,
		autoLoadEntities: true
	};

	// Session config
	public readonly session = {
		cookieName: env.SESSION_COOKIE_NAME,
		secret: env.SESSION_SECRET,
		maxAge: env.SESSION_MAX_AGE,
		connectionConfig: {
			host: env.DB_HOST,
			port: env.DB_PORT,
			user: env.DB_USER,
			password: env.DB_PASSWORD,
			database: env.DB_NAME
		}
	};

	// WebSocket config
	public readonly websocket = {
		path: env.SOCKET_PATH
	};

	// Providers config
	public readonly providers = PROVIDERS;

	// Queue/Worker config (implementation-agnostic)
	public readonly queue = {
		retryLimit: 2,
		retryDelay: 10, // seconds
		removeOnComplete: true, // Remove immediately after completion
		removeOnFail: true // Remove immediately after final failure
	};

	// Ollama config
	public readonly ollama = {
		baseUrl: `http://${env.OLLAMA_HOST}:${env.OLLAMA_PORT}`,
		model: env.OLLAMA_MODEL,
		temperature: env.OLLAMA_TEMPERATURE,
		maxTokens: env.OLLAMA_MAX_TOKENS
	};

	// Gemini config
	public readonly gemini = {
		apiKey: env.GEMINI_API_KEY,
		model: 'gemini-2.5-flash', // env.GEMINI_MODEL,
		temperature: env.GEMINI_TEMPERATURE,
		maxTokens: env.GEMINI_MAX_TOKENS
	};

	// CORS config
	public readonly cors = {
		origin: env.CORS_ORIGIN.split(',').map(origin => origin.trim()),
		credentials: true
	};
}

const AppDataSource = new DataSource({
	type: 'mysql',
	host: env.DB_HOST,
	port: env.DB_PORT,
	username: env.DB_USER,
	password: env.DB_PASSWORD,
	database: env.DB_NAME,
	entities: [User, Generation, GenerationRequest, Session],
	migrations: ['dist/migrations/*.js'],
	synchronize: false
});

export { AppConfigService, AppDataSource, PROVIDERS, HOSTNAME_VALIDATION };
