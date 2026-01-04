import { AnalyzeHostnameDtoRequest } from './dto/stats-request.dto';
import { AnalyzeHostnameDtoResponse } from './dto/stats-response.dto';
import { MessageSuccess } from '../../utils/response/message-success';
import { MessageError } from '../../utils/response/message-error';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiResponse } from '../../utils/response/api-response';
import { ResponseCode } from '../../enums/response-code.enum';
import { StatsService } from './stats.service';

@Controller('api/stats')
class StatsController {
	constructor(
		private readonly statsService: StatsService,
		private readonly responseFactory: ApiResponse
	) { }

	@Get('host')
	public async host(@Query() query: AnalyzeHostnameDtoRequest): Promise<ApiResponse<MessageSuccess<AnalyzeHostnameDtoResponse> | MessageError>> {
		try {
			const analysis = await this.statsService.analyzeHostname(query.hostname);
			return this.responseFactory.success(analysis);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to analyze hostname';
			return this.responseFactory.error(ResponseCode.ERROR, message);
		}
	}
}

export { StatsController };
