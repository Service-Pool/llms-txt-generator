import { AppConfigService } from '../config/config.service';
import { AppModule } from './app.module';
import { createWinstonLogger } from '../config/config.logger';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifySession from '@fastify/session';
import fastifyWebsocket from '@fastify/websocket';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from '../filters/global-exception.filter';
import { ValidationException } from '../exceptions/validation.exception';
import { ValidationError, useContainer } from 'class-validator';
import { SessionService } from '../modules/auth/services/session.service';
import { TypeOrmSessionStore } from '../modules/auth/stores/typeorm-session.store';

/**
 * Create and configure the NestJS application
 */
export async function createApp(): Promise<NestFastifyApplication> {
	const configService = new AppConfigService();
	const logger = createWinstonLogger();

	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		new FastifyAdapter({ bodyLimit: 10485760 }),
		{
			logger,
			rawBody: true
		}
	);

	// Enable DI for class-validator
	useContainer(app.select(AppModule), { fallbackOnErrors: true });

	// Configure CORS
	await app.register(fastifyCors, {
		origin: (origin, callback) => {
			const allowedDomains = configService.allowedDomains;

			// Разрешить запросы без origin (например, Postman, curl)
			if (!origin) {
				callback(null, true);
				return;
			}

			// Если allowedDomains содержит '*', разрешить любой origin
			if (allowedDomains.includes('*')) {
				callback(null, true);
				return;
			}

			// Проверить origin против whitelist
			const isAllowed = allowedDomains.some(domain => origin.startsWith(domain));

			if (isAllowed) {
				callback(null, true);
			} else {
				callback(new Error(`Origin ${origin} is not allowed by CORS`), false);
			}
		},
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
		exposedHeaders: ['Set-Cookie']
	});

	// Register WebSocket plugin
	await app.register(fastifyWebsocket);

	// Register cookie plugin
	await app.register(fastifyCookie);

	// Get SessionService from DI container
	const sessionService = app.get(SessionService);

	// Register session plugin with TypeORM store
	await app.register(fastifySession, {
		secret: configService.session.secret,
		cookieName: configService.session.cookieName,
		saveUninitialized: true,
		rolling: true,
		store: new TypeOrmSessionStore(sessionService),
		cookie: {
			maxAge: configService.session.maxAge,
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict'
		}
	});

	// Global validation pipe
	app.useGlobalPipes(new ValidationPipe({
		whitelist: true,
		forbidNonWhitelisted: true,
		transform: true,
		exceptionFactory: (errors: ValidationError[]) => {
			return new ValidationException(errors);
		}
	}));

	// Global exception filter
	app.useGlobalFilters(new GlobalExceptionFilter());

	// Health check endpoint
	app.getHttpAdapter().get('/health', (req, res) => {
		res.send({ status: 'ok' });
	});

	return app;
}

async function bootstrap() {
	if (!process.env.PORT) {
		throw new Error('PORT environment variable is not defined');
	}

	const app = await createApp();

	await app.listen(parseInt(process.env.PORT), '0.0.0.0');

	const appLogger = new Logger('Application');
	appLogger.log(`Application is running on port ${process.env.PORT}`);
}

// Only run bootstrap if this file is executed directly
if (require.main === module) {
	bootstrap().catch((err) => {
		const logger = createWinstonLogger();
		const error = err instanceof Error ? err : new Error(String(err));
		logger.error('Failed to start application', error.stack || error.message);
		process.exit(1);
	});
}
