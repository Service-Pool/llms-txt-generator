import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../config/config.service';
import { ModelConfigDto } from '../dto/ai-model-config.dto';
import { AvailableAiModelDto } from '../dto/available-ai-model.dto';

@Injectable()
class AiModelsConfigService {
	constructor(private readonly configService: AppConfigService) { }

	/**
	 * Get all available model configurations from MODELS_CONFIG
	 */
	public getAllModels(): ModelConfigDto[] {
		return this.configService.modelsConfig;
	}

	/**
	 * Get model configuration by ID
	 */
	public getModelById(id: string): ModelConfigDto | null {
		const models = this.getAllModels();
		return models.find(m => m.id === id) || null;
	}

	/**
	 * Get available models for specific order parameters
	 * Paid models (baseRate > 0) are available to all, but require authentication at startOrder
	 */
	public getAvailableModels(totalUrls: number, _isAuthenticated: boolean): AvailableAiModelDto[] {
		const models = this.getAllModels();

		return models.map((model) => {
			return AvailableAiModelDto.fromModelConfig(model, totalUrls);
		});
	}

	/**
	 * Calculate total price for a model and number of URLs
	 */
	public calculatePrice(modelId: string, totalUrls: number): number {
		const model = this.getModelById(modelId);
		if (!model) {
			throw new Error(`Model ${modelId} not found`);
		}

		return model.baseRate * totalUrls;
	}

	/**
	 * Get unique queue names from all models
	 */
	public getUniqueQueueNames(): string[] {
		const models = this.getAllModels();
		const queueNames = models.map(m => m.queueName);
		return [...new Set(queueNames)];
	}
}

export { AiModelsConfigService };
