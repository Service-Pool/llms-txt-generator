import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueManagerService } from './services/queue-manager.service';
import { OrderJobHandler } from './handlers/order-job.handler';
import { AiModelsModule } from '../ai-models/ai-models.module';
import { CrawlersModule } from '../crawlers/crawlers.module';
import { ContentModule } from '../content/content.module';
import { GenerationsModule } from '../generations/generations.module';
import { OrdersModule } from '../orders/orders.module';

import { StatsModule } from '../stats/stats.module';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';

/**
 * Queue Module
 * Provides BullMQ queue services for processing Orders
 *
 * Динамически создает очереди на основе конфигурации моделей
 */
@Module({
	imports: [
		TypeOrmModule.forFeature([Order, User]),
		AiModelsModule,
		CrawlersModule,
		ContentModule,
		GenerationsModule,
		StatsModule,
		forwardRef(() => OrdersModule)
	],
	providers: [QueueManagerService, OrderJobHandler],
	exports: [QueueManagerService, OrderJobHandler]
})

export class QueueModule { }
