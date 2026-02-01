import { config as dotenvConfig } from 'dotenv';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ModelConfigDto } from '../modules/models/dto/model-config.dto';
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
	SESSION_COOKIE_NAME: string;
	SESSION_MAX_AGE: number;
	SESSION_SECRET: string;
	SOCKET_PATH: string;
	STRIPE_SECRET_KEY: string;
	STRIPE_PUBLISHABLE_KEY: string;
	STRIPE_WEBHOOK_SECRET: string;
	ALLOWED_DOMAINS: string;
	MODELS_CONFIG: string;
	SMTP_HOST: string;
	SMTP_PORT: number;
	SMTP_USER: string;
	SMTP_PASSWORD: string;
	LOGIN_LINK_EXPIRY_MINUTES: number;
	AES_KEY: string;
	AES_IV: string;
}

const validationSchema = Joi.object<ValidatedEnv>({
	DB_HOST: Joi.string().required(),
	DB_NAME: Joi.string().required(),
	DB_PASSWORD: Joi.string().required(),
	DB_PORT: Joi.number().port().required(),
	DB_USER: Joi.string().required(),
	REDIS_HOST: Joi.string().required(),
	REDIS_PORT: Joi.number().port().required(),
	SESSION_COOKIE_NAME: Joi.string().required(),
	SESSION_MAX_AGE: Joi.number().required(),
	SESSION_SECRET: Joi.string().required(),
	SOCKET_PATH: Joi.string(),
	STRIPE_SECRET_KEY: Joi.string().required(),
	STRIPE_PUBLISHABLE_KEY: Joi.string().required(),
	STRIPE_WEBHOOK_SECRET: Joi.string().optional(),
	ALLOWED_DOMAINS: Joi.string().required(),
	MODELS_CONFIG: Joi.string().required(),
	SMTP_HOST: Joi.string().required(),
	SMTP_PORT: Joi.number().port().required(),
	SMTP_USER: Joi.string().email().required(),
	SMTP_PASSWORD: Joi.string().required(),
	LOGIN_LINK_EXPIRY_MINUTES: Joi.number().integer().min(5).max(60).required(),
	AES_KEY: Joi.string().base64().required(),
	AES_IV: Joi.string().base64().required()
});

function validateEnv(): ValidatedEnv {
	const result = validationSchema.validate(process.env, {
		allowUnknown: true,
		abortEarly: false
	});

	if (result.error) {
		throw new InternalServerErrorException(`Config validation error (Joi): ${result.error.message}`);
	}

	return result.value as ValidatedEnv;
}

const env = validateEnv();

function interpolateEnvVariables<T>(value: T): T {
	if (typeof value === 'string') {
		return value.replace(/\$\{([^}]+)\}/g, (_, varName: string) => {
			return process.env[varName] || '';
		}) as T;
	}

	if (Array.isArray(value)) {
		return (value as unknown[]).map(item => interpolateEnvVariables(item)) as unknown as T;
	}

	if (value && typeof value === 'object') {
		const result: Record<string, unknown> = {};
		for (const key in value) {
			result[key] = interpolateEnvVariables((value as Record<string, unknown>)[key]);
		}
		return result as T;
	}
	return value;
}

const HOSTNAME_VALIDATION = {
	regex: /^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
	message: 'Hostname must be a valid domain with protocol (http:// or https://) without path, query or trailing slash'
};

@Injectable()
class AppConfigService {
	public readonly database = {
		host: env.DB_HOST,
		port: env.DB_PORT,
		user: env.DB_USER,
		password: env.DB_PASSWORD,
		database: env.DB_NAME
	};

	public readonly redis = {
		host: env.REDIS_HOST,
		port: env.REDIS_PORT
	};

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

	public readonly session = {
		cookieName: env.SESSION_COOKIE_NAME,
		secret: env.SESSION_SECRET,
		maxAge: env.SESSION_MAX_AGE
	};

	public readonly websocket = {
		path: env.SOCKET_PATH
	};

	public readonly modelsConfig = ((): ModelConfigDto[] => {
		try {
			const parsed = JSON.parse(env.MODELS_CONFIG) as unknown[];
			if (!Array.isArray(parsed)) {
				throw new Error('MODELS_CONFIG must be an array');
			}
			return parsed.map((item: ModelConfigDto) => {
				const interpolated = interpolateEnvVariables(item);
				return new ModelConfigDto(
					interpolated.id,
					interpolated.category,
					interpolated.displayName,
					interpolated.description,
					interpolated.serviceClass,
					interpolated.modelName,
					interpolated.baseRate,
					interpolated.pageLimit,
					interpolated.queueName,
					interpolated.queueType,
					interpolated.batchSize,
					interpolated.options,
					interpolated.enabled
				);
			});
		} catch (error) {
			throw new InternalServerErrorException(`Failed to parse MODELS_CONFIG: ${error instanceof Error ? error.message : String(error)}`);
		}
	})();

	public readonly queue = {
		retryLimit: 2,
		retryDelay: 10,
		removeOnComplete: true,
		removeOnFail: true
	};

	public readonly stripe = {
		secretKey: env.STRIPE_SECRET_KEY,
		publishableKey: env.STRIPE_PUBLISHABLE_KEY,
		webhookSecret: env.STRIPE_WEBHOOK_SECRET
	};

	public readonly smtp = {
		host: env.SMTP_HOST,
		port: env.SMTP_PORT,
		user: env.SMTP_USER,
		password: env.SMTP_PASSWORD
	};

	public readonly allowedDomains = env.ALLOWED_DOMAINS.split(',').map(d => d.trim());

	public readonly loginLink = {
		expiryMinutes: env.LOGIN_LINK_EXPIRY_MINUTES
	};

	public readonly security = {
		aesKey: env.AES_KEY,
		aesIv: env.AES_IV
	};
}

// DataSource for TypeORM CLI (migrations)
const AppDataSource = new DataSource({
	type: 'mysql',
	host: env.DB_HOST,
	port: env.DB_PORT,
	username: env.DB_USER,
	password: env.DB_PASSWORD,
	database: env.DB_NAME,
	entities: ['src/modules/**/entities/*.entity.ts'],
	migrations: ['src/migrations/*.ts'],
	synchronize: false
});

export { HOSTNAME_VALIDATION, AppConfigService, AppDataSource };
