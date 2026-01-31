import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../config/config.service';
import { ModelConfigDto } from '../dto/model-config.dto';
import { AvailableModelDto } from '../dto/available-model.dto';

@Injectable()
export class ModelsConfigService {
	constructor(private readonly configService: AppConfigService) { }

	/**
	 * Get all available model configurations from MODELS_CONFIG
	 */
	getAllModels(): ModelConfigDto[] {
		return this.configService.modelsConfig;
	}

	/**
	 * Get model configuration by ID
	 */
	getModelById(id: string): ModelConfigDto | null {
		const models = this.getAllModels();
		return models.find(m => m.id === id) || null;
	}

	/**
	 * Get available models for specific order parameters
	 */
	getAvailableModels(totalUrls: number, _isAuthenticated: boolean): AvailableModelDto[] {
		const models = this.getAllModels();

		return models.map((model) => {
			const totalPrice = this.calculatePrice(model.id, totalUrls);
			const available = model.pageLimit === false || totalUrls <= model.pageLimit;
			const unavailableReason = available
				? null
				: `Exceeds page limit of ${model.pageLimit}`;

			return {
				...model,
				price: model.baseRate.toFixed(4),
				totalPrice: totalPrice.toFixed(2),
				available,
				unavailableReason
			};
		});
	}

	/**
	 * Calculate total price for a model and number of URLs
	 */
	calculatePrice(modelId: string, totalUrls: number): number {
		const model = this.getModelById(modelId);
		if (!model) {
			throw new Error(`Model ${modelId} not found`);
		}

		return model.baseRate * totalUrls;
	}

	/**
	 * Get unique queue names from all models
	 */
	getUniqueQueueNames(): string[] {
		const models = this.getAllModels();
		const queueNames = models.map(m => m.queueName);
		return [...new Set(queueNames)];
	}
}
