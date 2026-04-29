import { Module, forwardRef } from '@nestjs/common';
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


@Module({
	imports: [
		AiModelsModule,
		ContentModule,
		CrawlersModule,
		forwardRef(() => OrdersModule)
	],
	providers: [
		CacheService,
		EmbeddingService,
		PageProcessorFlat,
		PageProcessorClustered,
		FlatStrategy,
		ClusteredStrategy,
		GenerationStrategyFactory
	],
	exports: [
		CacheService,
		EmbeddingService,
		PageProcessorFlat,
		GenerationStrategyFactory
	]
})

export class GenerationsModule { }
