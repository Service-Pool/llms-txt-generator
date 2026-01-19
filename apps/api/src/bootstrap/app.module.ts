import { ApiResponse } from '../utils/response/api-response';
import { AppConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/config.service';
import { AuthModule } from '../modules/auth/auth.module';
import { CalculationsModule } from '../modules/calculations/calculations.module';
import { CalculationValidator } from '../validators/calculation.validator';
import { ClsModule } from 'nestjs-cls';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GenerationRequest } from '../modules/generations/entities/generation-request.entity';
import { GenerationRequestValidator } from '../validators/generation-request.validator';
import { GenerationsModule } from '../modules/generations/generations.module';
import { HttpModule } from '../modules/http/http.module';
import { Module } from '@nestjs/common';
import { QueueModule } from '../modules/queue/queue.module';
import { RobotsModule } from '../modules/robots/robots.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SitemapModule } from '../modules/sitemap/sitemap.module';
import { StripeModule } from '../modules/stripe/stripe.module';
import { type FastifyRequest } from 'fastify';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebSocketModule } from '../modules/websocket/websocket.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			ignoreEnvFile: true
		}),
		ClsModule.forRoot({
			global: true,
			interceptor: {
				mount: true,
				setup: (cls, context) => {
					const req = context.switchToHttp().getRequest<FastifyRequest>();
					cls.set('userId', req.session.userId || null);
					cls.set('sessionId', req.session.sessionId);
				}
			}
		}),
		EventEmitterModule.forRoot({
			global: true
		}),
		ScheduleModule.forRoot(),
		AppConfigModule,
		HttpModule,
		RobotsModule,
		SitemapModule,
		TypeOrmModule.forFeature([GenerationRequest]),
		TypeOrmModule.forRootAsync({
			inject: [AppConfigService],
			useFactory: (configService: AppConfigService) => configService.typeorm
		}),
		QueueModule,
		AuthModule,
		CalculationsModule,
		GenerationsModule,
		StripeModule,
		WebSocketModule
	],
	providers: [ApiResponse, CalculationValidator, GenerationRequestValidator],
	exports: [ApiResponse]
})
export class AppModule { }
