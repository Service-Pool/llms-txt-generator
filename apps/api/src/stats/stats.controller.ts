import { Controller, Get, Query } from '@nestjs/common';
import { StatsService } from './stats.service';
import { AnalyzeHostnameDtoRequest } from '../shared/dtos/stats-request.dto';
import { AnalyzeHostnameDtoResponse } from '../shared/dtos/stats-response.dto';
import { ResponseFactory } from '../common/utils/response.factory';

@Controller('api/stats')
class StatsController {
	constructor(private readonly statsService: StatsService) {}

	@Get('host')
	public async host(@Query() query: AnalyzeHostnameDtoRequest): Promise<ReturnType<typeof ResponseFactory.success<AnalyzeHostnameDtoResponse>> | ReturnType<typeof ResponseFactory.error>> {
		try {
			const analysis = await this.statsService.analyzeHostname(query.hostname);
			return ResponseFactory.success(analysis);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to analyze hostname';
			return ResponseFactory.error(message);
		}
	}
}

export { StatsController };
