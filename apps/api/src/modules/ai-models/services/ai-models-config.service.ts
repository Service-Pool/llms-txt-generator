import { Injectable } from '@nestjs/common';
import { AiModelConfigRepository } from '../repositories/ai-model-config.repository';
import { AvailableAiModelDto } from '../dto/available-ai-model.dto';
import { AiModelConfig } from '../entities/ai-model-config.entity';

/**
 * Service for working with AI Model configurations
 * Uses repository pattern for future database migration
 */
@Injectable()
class AiModelsConfigService {
	constructor(private readonly repository: AiModelConfigRepository) { }

	/**
	 * Get all available model configurations
	 */
	public getAllModels(): AiModelConfig[] {
		return this.repository.find();
	}

	/**
	 * Get model configuration by ID (synchronous for subscribers)
	 */
	public getModelByIdSync(id: string): AiModelConfig | null {
		return this.repository.findOneSync(id);
	}

	/**
	 * Get model configuration by ID
	 */
	public getModelById(id: string): AiModelConfig | null {
		const entity = this.repository.findOne({ where: { id } });
		return entity;
	}

	/**
	 * Get available models for specific order parameters
	 * Paid models (baseRate > 0) are available to all, but require authentication at runOrder
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
