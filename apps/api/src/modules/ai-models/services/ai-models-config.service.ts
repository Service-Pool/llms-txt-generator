import { Injectable } from '@nestjs/common';
import { AiModelConfigRepository } from '@/modules/ai-models/repositories/ai-model-config.repository';
import { AiModelResponseDto } from '@/modules/ai-models/dto/ai-model-response.dto';
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
	 * Get all enabled models as DTOs (for public API)
	 * Returns model configurations without order-specific calculations
	 */
	public getAllModelsConfig(): AiModelResponseDto[] {
		const models = this.getAllModels();

		return models
			.filter(model => model.enabled)
			.map((model) => {
				// Use totalUrls = 0 to show base configuration without order context
				const pricing = this.getModelPricing(model.id, 0);
				return AiModelResponseDto.fromModelConfig(model, 0, pricing.priceTotal);
			});
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
	public getAvailableModels(totalUrls: number, _isAuthenticated: boolean): AiModelResponseDto[] {
		const models = this.getAllModels();

		return models
			.filter(model => model.enabled)
			.map((model) => {
				const pricing = this.getModelPricing(model.id, totalUrls);
				return AiModelResponseDto.fromModelConfig(model, totalUrls, pricing.priceTotal);
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
