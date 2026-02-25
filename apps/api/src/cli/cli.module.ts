import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ClsModule } from 'nestjs-cls';
import { AppConfigModule } from '@/config/config.module';
import { AppConfigService } from '@/config/config.service';
import { QueueModule } from '@/modules/queue/queue.module';
import { OrdersModule } from '@/modules/orders/orders.module';
import { AiModelsModule } from '@/modules/ai-models/ai-models.module';
import { ContentModule } from '@/modules/content/content.module';
import { CrawlersModule } from '@/modules/crawlers/crawlers.module';
import { GenerationsModule } from '@/modules/generations/generations.module';
import { OrderWorkerCommand } from '@/cli/commands/order-worker.command';

/**
 * CLI Module
 * Provides CLI commands for background tasks
 *
 * Note: WebsocketModule, StatsModule будут добавлены позже
 */
@Module({
	imports: [
		AppConfigModule,
		ConfigModule.forRoot({
			isGlobal: true,
			ignoreEnvFile: true
		}),
		ClsModule.forRoot({
			global: true
		}),
		EventEmitterModule.forRoot({
			global: true
		}),
		TypeOrmModule.forRootAsync({
			inject: [AppConfigService],
			useFactory: (configService: AppConfigService) => configService.typeorm
		}),
		QueueModule,
		OrdersModule,
		AiModelsModule,
		ContentModule,
		CrawlersModule,
		GenerationsModule
	],
	providers: [OrderWorkerCommand]
})
export class CliModule { }
