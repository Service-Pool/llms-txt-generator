import { Injectable, Logger } from '@nestjs/common';
import { ContentExtractionService } from '@/modules/content/services/content-extraction.service';
import { CrawlersService } from '@/modules/crawlers/services/crawlers.service';
import { CacheService } from '@/modules/generations/services/cache.service';

/**
 * Сервис обработки страниц для Clustered стратегии.
 * Pipeline: fetch → vectorize → save cache (text + vector)
 * Суммаризация НЕ выполняется — LLM получает тексты целых кластеров.
 *
 * TODO: реализовать
 */
@Injectable()
class PageProcessorClustered {
	private readonly logger = new Logger(PageProcessorClustered.name);

	constructor(
		private readonly contentExtractionService: ContentExtractionService,
		private readonly crawlersService: CrawlersService,
		private readonly cacheService: CacheService
	) {}
}

export { PageProcessorClustered };
