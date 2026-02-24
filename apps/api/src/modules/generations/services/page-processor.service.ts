import { Injectable, Logger } from '@nestjs/common';
import { ContentExtractionService } from '../../content/services/content-extraction.service';
import { CacheService } from './cache.service';
import { PageContent, LLMProviderService } from './llm-provider.service';

/**
 * Сервис для обработки батча страниц:
 * - Хранение коллекции PageContent
 * - Извлечение контента
 * - Работа с кэшем
 * - Генерация саммари через LLM
 */
@Injectable()
class PageBatchProcessor {
	private readonly logger = new Logger(PageBatchProcessor.name);
	private readonly pages: PageContent[] = [];

	constructor(
		private readonly contentExtractionService: ContentExtractionService,
		private readonly cacheService: CacheService
	) { }

	/**
	 * Добавляет URL в батч, извлекает контент и создаёт PageContent
	 * @param url URL для добавления
	 */
	public async add(url: string): Promise<void> {
		try {
			this.logger.debug(`Starting content extraction for ${url}`);
			const startTime = Date.now();
			const { title, content } = await this.contentExtractionService.extractContent(url);
			const duration = Date.now() - startTime;
			this.logger.debug(`Content extracted in ${duration}ms for ${url}`);
			this.pages.push(new PageContent(url, title, content));
		} catch (error) {
			this.logger.error(`Failed to extract content for ${url}:`, error);
			throw error;
		}
	}

	/**
	 * Возвращает все накопленные страницы
	 */
	public getPages(): PageContent[] {
		return this.pages;
	}

	/**
	 * Возвращает количество страниц в батче
	 */
	public get count(): number {
		return this.pages.length;
	}

	/**
	 * Очищает батч
	 */
	public clear(): void {
		this.pages.length = 0;
	}

	/**
	 * Генерирует саммари для всех страниц в батче с использованием кэша и очищает батч
	 * @param modelId ID модели для кэша и генерации
	 * @param provider LLM провайдер для генерации саммари
	 * @param hostname Hostname для кэша
	 * @returns Копия обработанных страниц
	 */
	public async process(modelId: string, provider: LLMProviderService, hostname: string): Promise<PageContent[]> {
		if (this.pages.length === 0) {
			return [];
		}

		try {
			this.logger.debug(`Processing batch of ${this.pages.length} pages for ${hostname}`);
			const hashKey = this.cacheService.buildHashKey(modelId, hostname);

			// Проверяем кэш для каждой страницы и собираем некэшированные
			const uncachedPages: PageContent[] = [];
			const uncachedIndices: number[] = [];

			for (let i = 0; i < this.pages.length; i++) {
				const { path } = this.cacheService.parseUrl(this.pages[i].url);
				const cached = await this.cacheService.get(hashKey, path);

				if (cached) {
					this.pages[i].summary = cached;
					this.logger.debug(`Cache hit for ${this.pages[i].url}`);
				} else {
					uncachedPages.push(this.pages[i]);
					uncachedIndices.push(i);
				}
			}

			// Если есть некэшированные - генерируем батчем
			if (uncachedPages.length > 0) {
				this.logger.debug(`Generating ${uncachedPages.length} summaries in batch (cache miss)`);
				const generatedSummaries = await provider.generateBatchSummaries(uncachedPages);

				// Сохраняем в кэш и устанавливаем summary
				for (let i = 0; i < uncachedPages.length; i++) {
					const page = uncachedPages[i];
					const summary = generatedSummaries[i];

					page.summary = summary;

					// Сохранить в кэш
					const { path } = this.cacheService.parseUrl(page.url);
					await this.cacheService.set(hashKey, path, summary);
				}
			}

			// Возвращаем обработанные страницы перед очисткой
			return this.pages.slice();
		} catch (error) {
			this.logger.error(`Failed to process batch:`, error);
			throw new Error(`Failed to process batch: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			// Всегда очищаем батч после обработки
			this.clear();
		}
	}
}

export { PageBatchProcessor };
