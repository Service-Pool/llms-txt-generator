import { Injectable, Logger } from '@nestjs/common';
import { ContentExtractionService } from '../../content/services/content-extraction.service';
import { CacheService } from './cache.service';
import { ProcessedPage, LLMProviderService } from './llm-provider.service';

interface CachedPageData {
	title: string;
	summary: string;
}

/**
 * Сервис для обработки батча страниц:
 * - Накопление URLs
 * - Проверка кэша ДО парсинга
 * - Извлечение контента только для некэшированных
 * - Генерация саммари через LLM
 */
@Injectable()
class PageBatchProcessor {
	private readonly logger = new Logger(PageBatchProcessor.name);
	private readonly urls: string[] = [];

	constructor(
		private readonly contentExtractionService: ContentExtractionService,
		private readonly cacheService: CacheService
	) { }

	/**
	 * Добавляет URL в батч (БЕЗ парсинга контента)
	 * @param url URL для добавления
	 */
	public add(url: string): void {
		this.urls.push(url);
	}

	/**
	 * Возвращает количество URLs в батче
	 */
	public get count(): number {
		return this.urls.length;
	}

	/**
	 * Очищает батч
	 */
	public clear(): void {
		this.urls.length = 0;
	}

	/**
	 * Генерирует саммари для всех URLs в батче с использованием кэша и очищает батч
	 * Проверяет кэш ДО парсинга контента
	 * @param modelId ID модели для кэша и генерации
	 * @param provider LLM провайдер для генерации саммари
	 * @param hostname Hostname для кэша
	 * @returns Копия обработанных страниц
	 */
	public async process(modelId: string, provider: LLMProviderService, hostname: string): Promise<ProcessedPage[]> {
		if (this.urls.length === 0) {
			return [];
		}

		try {
			this.logger.debug(`Processing batch of ${this.urls.length} URLs for ${hostname}`);
			const hashKey = this.buildSummaryHashKey(modelId, hostname);

			// Проверяем кэш для каждого URL и собираем некэшированные
			const cachedPages: ProcessedPage[] = [];
			const urlsToFetch: string[] = [];

			for (const url of this.urls) {
				const { path } = this.parseUrl(url);
				const cached = await this.cacheService.get(hashKey, path);

				if (cached) {
					const data = JSON.parse(cached) as CachedPageData;
					const page = new ProcessedPage(url, data.title, '');
					page.summary = data.summary;
					cachedPages.push(page);
					this.logger.debug(`Cache hit for ${url}`);
				} else {
					urlsToFetch.push(url);
				}
			}

			// Если есть некэшированные - парсим и генерируем
			if (urlsToFetch.length > 0) {
				this.logger.debug(`Fetching content for ${urlsToFetch.length} uncached URLs`);

				// Парсить контент для некэшированных
				const uncachedPages: ProcessedPage[] = [];
				for (const url of urlsToFetch) {
					try {
						this.logger.debug(`Starting content extraction for ${url}`);
						const startTime = Date.now();
						const { title, content } = await this.contentExtractionService.extractContent(url);
						const duration = Date.now() - startTime;
						this.logger.debug(`Content extracted in ${duration}ms for ${url}`);
						uncachedPages.push(new ProcessedPage(url, title, content));
					} catch (error) {
						// Создаем ProcessedPage с ошибкой
						const errorMessage = error instanceof Error ? error.message : String(error);
						this.logger.warn(`Failed to extract ${url}: ${errorMessage}`);
						const failedPage = new ProcessedPage(url, '', '');
						failedPage.error = errorMessage;
						uncachedPages.push(failedPage);
						continue;
					}
				}

				// Генерировать summaries только для страниц без ошибок
				const validPages = uncachedPages.filter(p => !p.error);

				if (validPages.length > 0) {
					this.logger.debug(`Generating ${validPages.length} summaries in batch (cache miss)`);
					const generatedSummaries = await provider.generateBatchSummaries(validPages);

					// Сохранить в кэш и установить summaries
					for (let i = 0; i < validPages.length; i++) {
						const page = validPages[i];
						const summary = generatedSummaries[i];
						page.summary = summary;

						// Сохранить в кэш (JSON с title и summary)
						const { path } = this.parseUrl(page.url);
						const cacheValue = JSON.stringify({ title: page.title, summary });
						await this.cacheService.set(hashKey, path, cacheValue);
					}
				}

				// Возвращаем кэшированные + все uncached (включая с ошибками)
				return [...cachedPages, ...uncachedPages];
			}

			// Все были в кэше
			return cachedPages;
		} catch (error) {
			this.logger.error(`Failed to process batch:`, error);
			throw new Error(`Failed to process batch: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			// Всегда очищаем батч после обработки
			this.clear();
		}
	}

	/**
	 * Построить ключ для HASH в Redis с парсингом hostname
	 */
	public buildSummaryHashKey(modelId: string, hostnameOrUrl: string): string {
		const { hostname } = this.parseUrl(hostnameOrUrl);
		return `summary:${modelId}:${hostname}`;
	}

	/**
	 * Парсинг URL на hostname и path
	 */
	private parseUrl(url: string): { hostname: string; path: string } {
		const urlObj = new URL(url);
		return {
			hostname: urlObj.hostname,
			path: urlObj.pathname
		};
	}
}

export { PageBatchProcessor };
