import { Module } from '@nestjs/common';
import { ApiResponse } from '../../utils/response/api-response';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
	controllers: [StatsController],
	providers: [StatsService, ApiResponse],
	exports: [StatsService]
})
export class StatsModule { }
