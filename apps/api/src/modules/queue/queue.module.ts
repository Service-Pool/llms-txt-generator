import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueManagerService } from '@/modules/queue/services/queue-manager.service';
import { OrderJobHandler } from '@/modules/queue/handlers/order-job.handler';
import { QueueConfigRepository } from '@/modules/queue/repositories/queue-config.repository';
import { AiModelsModule } from '@/modules/ai-models/ai-models.module';
import { CrawlersModule } from '@/modules/crawlers/crawlers.module';
import { ContentModule } from '@/modules/content/content.module';
import { GenerationsModule } from '@/modules/generations/generations.module';
import { OrdersModule } from '@/modules/orders/orders.module';

import { StatsModule } from '@/modules/stats/stats.module';
import { Order } from '@/modules/orders/entities/order.entity';
import { User } from '@/modules/users/entities/user.entity';

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
	providers: [QueueManagerService, OrderJobHandler, QueueConfigRepository],
	exports: [QueueManagerService, OrderJobHandler]
})

export class QueueModule { }
