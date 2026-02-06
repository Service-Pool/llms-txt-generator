import { config as dotenvConfig } from 'dotenv';
import { Currency } from '../enums/currency.enum';
import { DataSource } from 'typeorm';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AiModelConfig } from '../modules/ai-models/entities/ai-model-config.entity';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as Joi from 'joi';

// Load .env
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
	STRIPE_MIN_PAYMENT: number;
	STRIPE_CURRENCY: string;
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
	STRIPE_MIN_PAYMENT: Joi.number().positive().required(),
	STRIPE_CURRENCY: Joi.string().uppercase().valid(...Object.values(Currency)).required(),
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

function interpolateEnvVariables(value: string): string {
	if (typeof value === 'string') {
		let result: string = value;
		for (const [key, val] of Object.entries(process.env)) {
			if (val) {
				result = result.replaceAll(new RegExp(`\\b${key}\\b`, 'g'), val);
			}
		}
		return result;
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

	public readonly aiModelConfig = ((): AiModelConfig[] => {
		try {
			const interpolated = interpolateEnvVariables(env.MODELS_CONFIG);
			const parsed = JSON.parse(interpolated) as unknown[];

			if (!Array.isArray(parsed)) {
				throw new Error('MODELS_CONFIG must be an array');
			}

			return parsed.map((item: unknown) => {
				const json = item as AiModelConfig;
				const config: AiModelConfig = {
					id: json.id,
					category: json.category,
					currency: Currency[env.STRIPE_CURRENCY as keyof typeof Currency],
					displayName: json.displayName,
					description: json.description,
					serviceClass: json.serviceClass,
					modelName: json.modelName,
					baseRate: json.baseRate,
					pageLimit: json.pageLimit,
					queueName: json.queueName,
					queueType: json.queueType,
					batchSize: json.batchSize,
					options: json.options,
					enabled: json.enabled
				};
				return config;
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
		webhookSecret: env.STRIPE_WEBHOOK_SECRET,
		minPayment: env.STRIPE_MIN_PAYMENT
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
