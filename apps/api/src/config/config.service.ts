import { config as dotenvConfig } from 'dotenv';
import { Currency, CURRENCY_SYMBOLS } from '../enums/currency.enum';
import { DataSource } from 'typeorm';
import { Generation } from '../modules/generations/entities/generation.entity';
import { GenerationRequest } from '../modules/generations/entities/generation-request.entity';
import { Calculation } from '../modules/calculations/entities/calculation.entity';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Provider } from '../enums/provider.enum';
import { Session } from '../modules/auth/entitites/session.entity';
import { StripePaymentMethod } from '../enums/stripe-payment-method.enum';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../modules/auth/entitites/user.entity';
import * as Joi from 'joi';

dotenvConfig();

interface ValidatedEnv {
	AES_KEY: string;
	AES_IV: string;
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
	GEMINI_PRICE_PER_1K_TOKENS_INPUT: number;
	GEMINI_PRICE_PER_1K_TOKENS_OUTPUT: number;
	OLLAMA_PRICE_PER_1K_TOKENS_INPUT: number;
	OLLAMA_PRICE_PER_1K_TOKENS_OUTPUT: number;
	AVG_INPUT_TOKENS_PER_PAGE: number;
	AVG_OUTPUT_TOKENS_PER_PAGE: number;
	PRICING_MARGIN_MULTIPLIER: number;
	PRICING_CURRENCY_CODE: Currency;
	PRICING_MIN_PAYMENT: number;
	SESSION_COOKIE_NAME: string;
	SESSION_MAX_AGE: number;
	SESSION_SECRET: string;
	SOCKET_PATH: string;
	STRIPE_SECRET_KEY: string;
	STRIPE_PUBLISHABLE_KEY: string;
	STRIPE_WEBHOOK_SECRET: string;
	STRIPE_PAYMENT_METHOD: StripePaymentMethod;
	FRONTEND_HOST: string;
	SMTP_HOST: string;
	SMTP_PORT: number;
	SMTP_USER: string;
	SMTP_PASSWORD: string;
	LOGIN_LINK_EXPIRY_MINUTES: number;
}

interface ProviderConfig {
	queueName: string;
	pricePerUrl: number;
	priceCurrency: Currency;
	currencySymbol: string;
	minPayment: number;
	enabled: boolean;
	batchSize: number;
}

const validationSchema = Joi.object<ValidatedEnv>({
	AES_KEY: Joi.string().base64().length(44).required(),
	AES_IV: Joi.string().base64().length(24).required(),
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
	GEMINI_PRICE_PER_1K_TOKENS_INPUT: Joi.number().min(0).required(),
	GEMINI_PRICE_PER_1K_TOKENS_OUTPUT: Joi.number().min(0).required(),
	OLLAMA_PRICE_PER_1K_TOKENS_INPUT: Joi.number().min(0).required(),
	OLLAMA_PRICE_PER_1K_TOKENS_OUTPUT: Joi.number().min(0).required(),
	AVG_INPUT_TOKENS_PER_PAGE: Joi.number().integer().min(1).required(),
	AVG_OUTPUT_TOKENS_PER_PAGE: Joi.number().integer().min(1).required(),
	PRICING_MARGIN_MULTIPLIER: Joi.number().min(1).required(),
	PRICING_CURRENCY_CODE: Joi.string().valid(...Object.values(Currency)).required(),
	PRICING_MIN_PAYMENT: Joi.number().min(0.5).required(),
	SESSION_COOKIE_NAME: Joi.string().required(),
	SESSION_MAX_AGE: Joi.number().required(),
	SESSION_SECRET: Joi.string().required(),
	SOCKET_PATH: Joi.string(),
	STRIPE_SECRET_KEY: Joi.string().required(),
	STRIPE_PUBLISHABLE_KEY: Joi.string().required(),
	STRIPE_WEBHOOK_SECRET: Joi.string().optional(),
	STRIPE_PAYMENT_METHOD: Joi.string().valid(...Object.values(StripePaymentMethod)).default(StripePaymentMethod.CHECKOUT),
	FRONTEND_HOST: Joi.string().uri().required(),
	SMTP_HOST: Joi.string().required(),
	SMTP_PORT: Joi.number().port().required(),
	SMTP_USER: Joi.string().email().required(),
	SMTP_PASSWORD: Joi.string().required(),
	LOGIN_LINK_EXPIRY_MINUTES: Joi.number().integer().min(5).max(60).required()
});

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

function calculatePricePerUrl(avgInputTokens: number, avgOutputTokens: number, inputTokenPrice: number, outputTokenPrice: number, marginMultiplier: number): number {
	const inputCost = (avgInputTokens / 1000) * inputTokenPrice;
	const outputCost = (avgOutputTokens / 1000) * outputTokenPrice;
	const totalCost = (inputCost + outputCost) * marginMultiplier;

	return totalCost;
}

const PROVIDERS: Record<Provider, ProviderConfig> = {
	[Provider.GEMINI]: {
		queueName: 'gemini-queue',
		pricePerUrl: calculatePricePerUrl(
			env.AVG_INPUT_TOKENS_PER_PAGE,
			env.AVG_OUTPUT_TOKENS_PER_PAGE,
			env.GEMINI_PRICE_PER_1K_TOKENS_INPUT,
			env.GEMINI_PRICE_PER_1K_TOKENS_OUTPUT,
			env.PRICING_MARGIN_MULTIPLIER
		),
		priceCurrency: env.PRICING_CURRENCY_CODE,
		currencySymbol: CURRENCY_SYMBOLS[env.PRICING_CURRENCY_CODE],
		minPayment: env.PRICING_MIN_PAYMENT,
		enabled: true,
		batchSize: 50
	},
	[Provider.OLLAMA]: {
		queueName: 'ollama-queue',
		pricePerUrl: calculatePricePerUrl(
			env.AVG_INPUT_TOKENS_PER_PAGE,
			env.AVG_OUTPUT_TOKENS_PER_PAGE,
			env.OLLAMA_PRICE_PER_1K_TOKENS_INPUT,
			env.OLLAMA_PRICE_PER_1K_TOKENS_OUTPUT,
			env.PRICING_MARGIN_MULTIPLIER
		),
		priceCurrency: env.PRICING_CURRENCY_CODE,
		currencySymbol: CURRENCY_SYMBOLS[env.PRICING_CURRENCY_CODE],
		minPayment: env.PRICING_MIN_PAYMENT,
		enabled: true,
		batchSize: 2
	}
};

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

	// Stripe config
	public readonly stripe = {
		secretKey: env.STRIPE_SECRET_KEY,
		publishableKey: env.STRIPE_PUBLISHABLE_KEY,
		webhookSecret: env.STRIPE_WEBHOOK_SECRET,
		frontendHost: env.FRONTEND_HOST,
		paymentMethod: env.STRIPE_PAYMENT_METHOD
	};

	// SMTP config
	public readonly smtp = {
		host: env.SMTP_HOST,
		port: env.SMTP_PORT,
		user: env.SMTP_USER,
		password: env.SMTP_PASSWORD
	};

	// Security config
	public readonly security = {
		aesKey: env.AES_KEY,
		aesIv: env.AES_IV
	};

	// Login Link config
	public readonly loginLink = {
		frontendHost: env.FRONTEND_HOST,
		expiryMinutes: env.LOGIN_LINK_EXPIRY_MINUTES
	};
}

const AppDataSource = new DataSource({
	type: 'mysql',
	host: env.DB_HOST,
	port: env.DB_PORT,
	username: env.DB_USER,
	password: env.DB_PASSWORD,
	database: env.DB_NAME,
	entities: [
		Calculation,
		Generation,
		GenerationRequest,
		Session,
		User
	],
	migrations: ['dist/migrations/*.js'],
	synchronize: false
});

export { AppConfigService, AppDataSource, PROVIDERS, HOSTNAME_VALIDATION };
