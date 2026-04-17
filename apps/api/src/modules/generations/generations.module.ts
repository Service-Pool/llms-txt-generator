import { Module, forwardRef } from '@nestjs/common';
import { LLMProviderFactory } from '@/modules/generations/services/llm-provider-factory.service';
import { CacheService } from '@/modules/generations/services/cache.service';
import { EmbeddingService } from '@/modules/generations/services/models/embedding.service';
import { PageProcessorFlat } from '@/modules/generations/services/page-processor-flat.service';
import { PageProcessorClustered } from '@/modules/generations/services/page-processor-clustered.service';
import { FlatStrategy } from '@/modules/generations/strategies/flat.strategy';
import { ClusteredStrategy } from '@/modules/generations/strategies/clustered.strategy';
import { GenerationStrategyFactory } from '@/modules/generations/strategies/generation-strategy.factory';
import { AiModelsModule } from '@/modules/ai-models/ai-models.module';
import { ContentModule } from '@/modules/content/content.module';
import { CrawlersModule } from '@/modules/crawlers/crawlers.module';
import { OrdersModule } from '@/modules/orders/orders.module';

/**
 * Generations Module
 * Provides LLM services for content generation
 *
 * Note: GeminiService and OllamaService are NOT providers here.
 * They are instantiated dynamically by LLMProviderFactory based on model config.
 */
@Module({
	imports: [
		AiModelsModule,
		ContentModule,
		CrawlersModule,
		forwardRef(() => OrdersModule)
	],
	providers: [
		LLMProviderFactory,
		CacheService,
		EmbeddingService,
		PageProcessorFlat,
		PageProcessorClustered,
		FlatStrategy,
		ClusteredStrategy,
		GenerationStrategyFactory
	],
	exports: [
		LLMProviderFactory,
		CacheService,
		EmbeddingService,
		PageProcessorFlat,
		GenerationStrategyFactory
	]
})

export class GenerationsModule { }
