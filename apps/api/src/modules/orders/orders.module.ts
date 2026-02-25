import { CrawlersModule } from '@/modules/crawlers/crawlers.module';
import { ContentModule } from '@/modules/content/content.module';
import { AiModelsModule } from '@/modules/ai-models/ai-models.module';
import { QueueModule } from '@/modules/queue/queue.module';
import { UsersModule } from '@/modules/users/users.module';
import { PaymentsModule } from '@/modules/payments/payments.module';
import { Module, forwardRef } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { Order } from '@/modules/orders/entities/order.entity';
import { OrdersController } from '@/modules/orders/controllers/orders.controller';
import { OrdersService } from '@/modules/orders/services/orders.service';
import { OrderSubscriber } from '@/modules/orders/subscribers/order.subscriber';
import { RobotsAccessibleValidator, SitemapAccessibleValidator } from '@/validators/host.validator';
import { AiModelValidator } from '@/validators/ai-model.validator';
import { OrderHasOutputValidator, OrderCanBeDeletedValidator } from '@/validators/order.validator';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
	imports: [
		TypeOrmModule.forFeature([Order]),
		ClsModule,
		CrawlersModule,
		AiModelsModule,
		ContentModule,
		UsersModule,
		forwardRef(() => QueueModule),
		forwardRef(() => PaymentsModule)
	],
	controllers: [OrdersController],
	providers: [
		OrdersService,
		OrderSubscriber,
		RobotsAccessibleValidator,
		SitemapAccessibleValidator,
		AiModelValidator,
		OrderHasOutputValidator,
		OrderCanBeDeletedValidator
	],
	exports: [OrdersService]
})

export class OrdersModule { }
