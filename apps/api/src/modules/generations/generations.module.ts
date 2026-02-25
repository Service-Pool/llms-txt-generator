import { Module } from '@nestjs/common';
import { LLMProviderFactory } from '@/modules/generations/services/llm-provider-factory.service';
import { CacheService } from '@/modules/generations/services/cache.service';
import { PageProcessor } from '@/modules/generations/services/page-processor.service';
import { AiModelsModule } from '@/modules/ai-models/ai-models.module';
import { ContentModule } from '@/modules/content/content.module';
import { CrawlersModule } from '@/modules/crawlers/crawlers.module';

/**
 * Generations Module
 * Provides LLM services for content generation
 *
 * Note: GeminiService and OllamaService are NOT providers here.
 * They are instantiated dynamically by LLMProviderFactory based on model config.
 */
@Module({
	imports: [AiModelsModule, ContentModule, CrawlersModule],
	providers: [
		LLMProviderFactory,
		CacheService,
		PageProcessor
	],
	exports: [
		LLMProviderFactory,
		CacheService,
		PageProcessor
	]
})

export class GenerationsModule { }
