import { Injectable, Logger } from '@nestjs/common';
import { LLMProviderService } from './llm-provider.service';
import { AiModelsConfigService } from '../../ai-models/services/ai-models-config.service';
import * as path from 'path';

/**
 * Фабрика для получения правильного LLM провайдера на основе serviceClass модели
 */
@Injectable()
class LLMProviderFactory {
	private readonly logger = new Logger(LLMProviderFactory.name);

	constructor(private readonly aiModelsConfigService: AiModelsConfigService) { }

	/**
	 * Получить провайдера LLM на основе modelId
	 * @param modelId ID модели из MODELS_CONFIG
	 * @returns Экземпляр соответствующего провайдера
	 */
	public async getProvider(modelId: string): Promise<LLMProviderService> {
		this.logger.debug(`Getting LLM provider for model: ${modelId}`);

		const modelConfig = this.aiModelsConfigService.getModelById(modelId);
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

			// Извлечь имя класса из filename: "ollama.service" -> "OllamaService"
			const filename = path.basename(modelConfig.serviceClass, '.ts');
			const className = filename
				.split(/[.-]/)
				.map(part => part.charAt(0).toUpperCase() + part.slice(1))
				.join('');

			this.logger.debug(`Looking for class: ${className} in module`);

			const ServiceClass = (module as Record<string, unknown>)[className];

			if (!ServiceClass) {
				throw new Error(`Service class ${className} not found in ${modelConfig.serviceClass}. Available exports: ${Object.keys(module).join(', ')}`);
			}

			return new (ServiceClass as new (...args: unknown[]) => LLMProviderService)(modelConfig);
		} catch (error) {
			this.logger.error(`Failed to load service: ${modelConfig.serviceClass}`, error);
			throw new Error(`Failed to load LLM provider: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
}

export { LLMProviderFactory };
