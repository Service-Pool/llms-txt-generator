import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { AppConfigService } from './config/config.service';
import { createWinstonLogger } from './config/config.logger';
import { Session } from './auth/entitites/session.entity';
import { TypeORMSessionStore } from './auth/typeorm-session.store';
import { WebSocketAdapter } from './websocket/websocket.adapter';

async function bootstrap() {
	if (!process.env.PORT) {
		throw new Error('PORT environment variable is not defined');
	}

	const configService = new AppConfigService();
	const logger = createWinstonLogger();

	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		new FastifyAdapter(),
		{ logger }
	);

	// Setup WebSocket adapter
	app.useWebSocketAdapter(new WebSocketAdapter(app));

	// Enable CORS
	app.enableCors({
		origin: configService.cors.origin,
		credentials: configService.cors.credentials,
		methods: ['GET', 'PUT', 'POST']
	});

	// Register cookie plugin
	await app.register(fastifyCookie);

	// Get TypeORM DataSource for sessions
	const dataSource = app.get(DataSource);
	const sessionRepository = dataSource.getRepository(Session);
	const sessionStore = new TypeORMSessionStore(sessionRepository, configService.session.maxAge);

	// Register session plugin with TypeORM store
	await app.register(fastifySession, {
		secret: configService.session.secret,
		cookieName: configService.session.cookieName,
		store: sessionStore,
		saveUninitialized: true,
		cookie: {
			maxAge: configService.session.maxAge,
			httpOnly: true,
			secure: false,
			sameSite: 'lax'
		}
	});

	// Global validation pipe
	app.useGlobalPipes(new ValidationPipe({
		whitelist: true,
		forbidNonWhitelisted: true,
		transform: true
	}));

	// Health check endpoint
	app.getHttpAdapter().get('/health', (req, res) => {
		res.send({ status: 'ok' });
	});

	await app.listen(parseInt(process.env.PORT), '0.0.0.0');

	logger.log(`Application is running on port ${process.env.PORT}`);
}
bootstrap().catch((err) => {
	const logger = createWinstonLogger();
	const error = err instanceof Error ? err : new Error(String(err));
	logger.error('Failed to start application', error.stack || error.message);
	process.exit(1);
});
