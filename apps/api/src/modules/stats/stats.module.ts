import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsService } from '@/modules/stats/services/stats.service';
import { StatsController } from '@/modules/stats/controllers/stats.controller';
import { Order } from '@/modules/orders/entities/order.entity';

@Module({
	imports: [TypeOrmModule.forFeature([Order])],
	providers: [StatsService],
	controllers: [StatsController],
	exports: [StatsService]
})

export class StatsModule { }
