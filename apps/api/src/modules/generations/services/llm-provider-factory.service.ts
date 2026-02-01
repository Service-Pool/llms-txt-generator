import { Injectable, Logger } from '@nestjs/common';
import { BaseLLMProviderService } from './base-llm-provider.service';
import { ModelsConfigService } from '../../models/services/models-config.service';
import * as path from 'path';

/**
 * Фабрика для получения правильного LLM провайдера на основе serviceClass модели
 */
@Injectable()
class LLMProviderFactory {
	private readonly logger = new Logger(LLMProviderFactory.name);

	constructor(private readonly modelsConfigService: ModelsConfigService) { }

	/**
	 * Получить провайдера LLM на основе modelId
	 * @param modelId ID модели из MODELS_CONFIG
	 * @returns Экземпляр соответствующего провайдера
	 */
	async getProvider(modelId: string): Promise<BaseLLMProviderService> {
		this.logger.debug(`Getting LLM provider for model: ${modelId}`);

		const modelConfig = this.modelsConfigService.getModelById(modelId);
		if (!modelConfig) {
			throw new Error(`Model configuration not found: ${modelId}`);
		}

		try {
			// Dynamic import based on serviceClass path
			const servicePath = path.join(__dirname, modelConfig.serviceClass);
			const module: unknown = await import(servicePath);

			if (!module || typeof module !== 'object') {
				throw new Error(`Failed to import module at path: ${servicePath}`);
			}

			// Convention: service file exports class with same name as filename
			const className = path.basename(modelConfig.serviceClass, '.ts').split('.')[0]
				.split('-')
				.map(part => part.charAt(0).toUpperCase() + part.slice(1))
				.join('');

			const ServiceClass = (module as Record<string, unknown>)[className];

			if (!ServiceClass) {
				throw new Error(`Service class ${className} not found in ${modelConfig.serviceClass}`);
			}

			return new (ServiceClass as new (...args: unknown[]) => BaseLLMProviderService)(modelConfig);
		} catch (error) {
			this.logger.error(`Failed to load service: ${modelConfig.serviceClass}`, error);
			throw new Error(`Failed to load LLM provider: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
}

export { LLMProviderFactory };
