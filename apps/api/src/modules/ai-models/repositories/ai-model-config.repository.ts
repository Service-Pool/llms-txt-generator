import { Injectable } from '@nestjs/common';
import { AppConfigService } from '@/config/config.service';
import { AiModelConfig } from '@/modules/ai-models/entities/ai-model-config.entity';

/**
 * In-memory repository for AI Model configurations
 * Implements repository pattern while loading data from config file
 *
 * This allows the application to work as if AiModelConfig is a database entity,
 * making future migration to database storage seamless.
 */
@Injectable()
class AiModelConfigRepository {
	private models: AiModelConfig[] = [];

	constructor(private readonly configService: AppConfigService) {
		this.loadFromConfig();
	}

	/**
	 * Load models from config file
	 */
	private loadFromConfig(): void {
		this.models = this.configService.aiModelConfig;
	}

	/**
	 * Find model by ID (synchronous for subscribers)
	 */
	findOneSync(id: string): AiModelConfig | null {
		const model = this.models.find(m => m.id === id);
		return model || null;
	}

	/**
	 * Find all models
	 */
	find(): AiModelConfig[] {
		return [...this.models];
	}

	/**
	 * Find model by ID
	 */
	findOne(options: { where: { id: string } }): AiModelConfig | null {
		const model = this.models.find(m => m.id === options.where.id);
		return model || null;
	}

	/**
	 * Find models matching criteria
	 */
	findBy(criteria: Partial<AiModelConfig>): AiModelConfig[] {
		return this.models.filter((model) => {
			return Object.entries(criteria).every(([key, value]) => {
				return model[key as keyof AiModelConfig] === value;
			});
		});
	}

	/**
	 * Count all models
	 */
	count(): number {
		return this.models.length;
	}

	/**
	 * Reload models from config (useful for hot-reload in development)
	 */
	reload(): void {
		this.loadFromConfig();
	}
}

export { AiModelConfigRepository };
