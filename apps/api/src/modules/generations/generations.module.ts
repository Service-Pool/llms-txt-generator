import { Module } from '@nestjs/common';
import { LLMProviderFactory } from './services/llm-provider-factory.service';
import { CacheService } from './services/cache.service';
import { AiModelsModule } from '../ai-models/ai-models.module';

/**
 * Generations Module
 * Provides LLM services for content generation
 *
 * Note: GeminiService and OllamaService are NOT providers here.
 * They are instantiated dynamically by LLMProviderFactory based on model config.
 */
@Module({
	imports: [AiModelsModule],
	providers: [
		LLMProviderFactory,
		CacheService
	],
	exports: [
		LLMProviderFactory,
		CacheService
	]
})

export class GenerationsModule { }
