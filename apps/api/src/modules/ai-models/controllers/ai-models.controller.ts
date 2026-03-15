import { Controller, Get, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { ApiResponse } from '@/utils/response/api-response';
import { HttpStatus } from '@/enums/response-code.enum';
import { AiModelsConfigService } from '@/modules/ai-models/services/ai-models-config.service';
import { AiModelResponseDto } from '@/modules/ai-models/dto/ai-model-response.dto';

/**
 * Public API для получения доступных AI моделей
 */
@ApiTags('AI Models')
@Controller('api/ai-models')
export class AiModelsController {
	constructor(private readonly aiModelsConfigService: AiModelsConfigService) { }

	/**
	 * GET /api/ai-models
	 * Получить конфигурацию всех доступных AI моделей
	 */
	@ApiOperation({
		summary: 'Get AI models configuration',
		description: 'Returns configuration of all available AI models including pricing, limits, and availability'
	})
	@SwaggerResponse({
		status: HttpStatus.OK,
		schema: ApiResponse.getSuccessSchema(AiModelResponseDto, true)
	})
	@Get()
	@HttpCode(HttpStatus.OK)
	getModelsConfig(): ApiResponse<AiModelResponseDto[]> {
		const models = this.aiModelsConfigService.getAllModelsConfig();
		return ApiResponse.success(models);
	}
}
