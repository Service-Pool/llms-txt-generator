import { CrawlersModule } from '../crawlers/crawlers.module';
import { ContentModule } from '../content/content.module';
import { Module } from '@nestjs/common';
import { Order } from './entities/order.entity';
import { OrdersController } from './controllers/orders.controller';
import { OrdersService } from './services/orders.service';
import { RobotsAccessibleValidator, SitemapAccessibleValidator } from '../../validators/host.validator';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
	imports: [
		TypeOrmModule.forFeature([Order]),
		CrawlersModule,
		ContentModule
	],
	controllers: [OrdersController],
	providers: [
		OrdersService,
		RobotsAccessibleValidator,
		SitemapAccessibleValidator
	],
	exports: [OrdersService]
})
export class OrdersModule { }
