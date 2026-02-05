import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsService } from './services/stats.service';
import { StatsController } from './controllers/stats.controller';
import { Order } from '../orders/entities/order.entity';

@Module({
	imports: [TypeOrmModule.forFeature([Order])],
	providers: [StatsService],
	controllers: [StatsController],
	exports: [StatsService]
})

export class StatsModule { }
