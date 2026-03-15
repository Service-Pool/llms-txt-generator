import { HttpClient } from './api.service';
import { configService } from './config.service';
import { AiModelResponseDto, type ApiResponse } from '@api/shared';

/**
 * AI Models API Service
 * Handles AI model configuration retrieval
 */
class AiModelsService extends HttpClient {
	/**
	 * Get all available AI models configuration
	 */
	async getAll(): Promise<ApiResponse<AiModelResponseDto[]>> {
		return this.fetch(configService.endpoints.aiModels.base, AiModelResponseDto);
	}
}

export const aiModelsService = new AiModelsService();
