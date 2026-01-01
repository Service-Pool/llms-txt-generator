import { AnalyzeHostnameDtoRequest } from './dto/stats-request.dto';
import { AnalyzeHostnameDtoResponse } from './dto/stats-response.dto';
import { Controller, Get, Query } from '@nestjs/common';
import { ResponseFactory } from '../../utils/response.factory';
import { StatsService } from './stats.service';

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
