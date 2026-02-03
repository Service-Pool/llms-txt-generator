import { Module } from '@nestjs/common';
import { LLMProviderFactory } from './services/llm-provider-factory.service';
import { CacheService } from './services/cache.service';
import { PageBatchProcessor } from './services/page-processor.service';
import { AiModelsModule } from '../ai-models/ai-models.module';
import { ContentModule } from '../content/content.module';

/**
 * Generations Module
 * Provides LLM services for content generation
 *
 * Note: GeminiService and OllamaService are NOT providers here.
 * They are instantiated dynamically by LLMProviderFactory based on model config.
 */
@Module({
	imports: [AiModelsModule, ContentModule],
	providers: [
		LLMProviderFactory,
		CacheService,
		PageBatchProcessor
	],
	exports: [
		LLMProviderFactory,
		CacheService,
		PageBatchProcessor
	]
})

export class GenerationsModule { }
