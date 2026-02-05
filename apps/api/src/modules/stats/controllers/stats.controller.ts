import { Controller, Get } from '@nestjs/common';
import { StatsService } from '../services/stats.service';
import { ApiResponse } from '../../../utils/response/api-response';
import { StatsResponseDto } from '../dto/stats-response.dto';

/**
 * Stats Controller
 * Public statistics endpoints
 */
@Controller('api/stats')
class StatsController {
	constructor(private readonly statsService: StatsService) { }

	/**
	 * GET /api/stats/completed
	 * Returns count of completed orders
	 */
	@Get('completed')
	async getCompleted(): Promise<ApiResponse<StatsResponseDto>> {
		const count = await this.statsService.getCompletedCount();

		return ApiResponse.success(StatsResponseDto.create(count));
	}
}

export { StatsController };
