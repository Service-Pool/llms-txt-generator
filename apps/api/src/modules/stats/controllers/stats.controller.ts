import { ApiResponse } from '@/utils/response/api-response';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';
import { HttpStatus } from '@/enums/response-code.enum';
import { StatsResponseDto } from '@/modules/stats/dto/stats-response.dto';
import { StatsService } from '@/modules/stats/services/stats.service';

/**
 * Stats Controller
 * Public statistics endpoints
 */
@ApiTags('Stats')
@Controller('api/stats')
class StatsController {
	constructor(private readonly statsService: StatsService) { }

	/**
	 * GET /api/stats/completed
	 * Returns count of completed orders
	 */
	@ApiOperation({ summary: 'Get completed orders count', description: 'Returns the total count of completed orders' })
	@SwaggerResponse({
		status: HttpStatus.OK,
		description: 'Completed orders count',
		schema: ApiResponse.getSuccessSchema(StatsResponseDto)
	})
	@Get('completed')
	async getCompleted(): Promise<ApiResponse<StatsResponseDto>> {
		const count = await this.statsService.getCompletedCount();

		return ApiResponse.success(StatsResponseDto.create(count));
	}
}

export { StatsController };
