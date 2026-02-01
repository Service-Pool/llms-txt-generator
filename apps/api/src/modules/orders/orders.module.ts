import { CrawlersModule } from '../crawlers/crawlers.module';
import { ContentModule } from '../content/content.module';
import { AiModelsModule } from '../ai-models/ai-models.module';
import { QueueModule } from '../queue/queue.module';
import { Module, forwardRef } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { Order } from './entities/order.entity';
import { OrdersController } from './controllers/orders.controller';
import { OrdersService } from './services/orders.service';
import { RobotsAccessibleValidator, SitemapAccessibleValidator } from '../../validators/host.validator';
import { AiModelValidator } from '../../validators/ai-model.validator';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
	imports: [
		TypeOrmModule.forFeature([Order]),
		ClsModule,
		CrawlersModule,
		AiModelsModule,
		ContentModule,
		forwardRef(() => QueueModule)
	],
	controllers: [OrdersController],
	providers: [
		OrdersService,
		RobotsAccessibleValidator,
		SitemapAccessibleValidator,
		AiModelValidator
	],
	exports: [OrdersService]
})

export class OrdersModule { }
