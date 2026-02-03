import { ApiResponse } from '../utils/response/api-response';
import { AppConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/config.service';
import { AuthModule } from '../modules/auth/auth.module';
import { ClsModule } from 'nestjs-cls';
import { ConfigModule } from '@nestjs/config';
import { ContentModule } from '../modules/content/content.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Module } from '@nestjs/common';
import { AiModelsModule } from '../modules/ai-models/ai-models.module';
import { OrdersModule } from '../modules/orders/orders.module';
import { PaymentsModule } from '../modules/payments/payments.module';
import { CrawlersModule } from '../modules/crawlers/crawlers.module';
import { ScheduleModule } from '@nestjs/schedule';
import { type FastifyRequest, type FastifyReply } from 'fastify';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../modules/users/users.module';

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
					const res = context.switchToHttp().getResponse<FastifyReply>();

					// Создаем контроллер отмены
					const abortController = new AbortController();

					// Fastify: если клиент ушел, отменяем сигнал
					req.raw.on('close', () => {
						if (!res.raw.writableEnded) {
							abortController.abort();
						}
					});

					cls.set('sessionData', req.session);
					cls.set('abortSignal', abortController.signal);
				}
			}
		}),
		EventEmitterModule.forRoot({
			global: true
		}),
		ScheduleModule.forRoot(),
		AppConfigModule,
		UsersModule,
		AuthModule,
		AiModelsModule,
		OrdersModule,
		PaymentsModule,
		CrawlersModule,
		ContentModule,
		TypeOrmModule.forRootAsync({
			inject: [AppConfigService],
			useFactory: (configService: AppConfigService) => configService.typeorm
		})
	],
	providers: [ApiResponse],
	exports: [ApiResponse]
})

export class AppModule { }
