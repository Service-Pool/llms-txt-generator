import { Injectable } from '@nestjs/common';
import { AiModelConfigRepository } from '@/modules/ai-models/repositories/ai-model-config.repository';
import { AvailableAiModelDto } from '@/modules/ai-models/dto/available-ai-model.dto';
import { AiModelConfig } from '@/modules/ai-models/entities/ai-model-config.entity';
import { AppConfigService } from '@/config/config.service';
import { Currency } from '@/enums/currency.enum';

/**
 * Service for working with AI Model configurations
 * Uses repository pattern for future database migration
 */
@Injectable()
class AiModelsConfigService {
	constructor(
		private readonly repository: AiModelConfigRepository,
		private readonly configService: AppConfigService
	) { }

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
	 * Uses getModelPricing to ensure consistent pricing with Stripe minimum applied
	 */
	public getAvailableModels(totalUrls: number, _isAuthenticated: boolean): AvailableAiModelDto[] {
		const models = this.getAllModels();

		return models.map((model) => {
			const pricing = this.getModelPricing(model.id, totalUrls);
			return AvailableAiModelDto.fromModelConfig(model, totalUrls, pricing.priceTotal);
		});
	}

	/**
	 * Get model pricing information with Stripe minimum payment applied
	 * Returns all data needed for order calculation
	 */
	public getModelPricing(modelId: string, totalUrls: number): {
		modelConfig: AiModelConfig;
		pricePerUrl: number;
		priceCurrency: Currency;
		priceTotal: number;
	} {
		const modelConfig = this.getModelById(modelId);
		if (!modelConfig) {
			throw new Error(`Model ${modelId} not found`);
		}

		const pricePerUrl = modelConfig.baseRate;
		const priceCurrency = modelConfig.currency;
		const minPayment = this.configService.stripe.minPayment;

		let priceTotal = pricePerUrl * totalUrls;

		// Apply Stripe minimum payment if price is below threshold
		if (priceTotal > 0 && priceTotal < minPayment) {
			priceTotal = minPayment;
		}

		return {
			modelConfig,
			pricePerUrl,
			priceCurrency,
			priceTotal
		};
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
