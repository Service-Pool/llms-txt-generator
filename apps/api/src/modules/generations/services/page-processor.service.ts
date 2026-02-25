import { Injectable, Logger } from '@nestjs/common';
import { ProcessedPage } from '@/modules/generations/services/llm-provider.service';
import { AbstractLlmService } from '@/modules/generations/services/models/abstractLlm.service';
import { ContentExtractionService } from '@/modules/content/services/content-extraction.service';
import { CrawlersService } from '@/modules/crawlers/services/crawlers.service';
import { CacheService } from '@/modules/generations/services/cache.service';

interface CachedPageData {
	title: string;
	summary: string;
}

/**
 * Сервис потоковой обработки страниц с использованием async generators.
 * Реализует pipeline: fetch → cache check → batch → LLM → save cache
 */
@Injectable()
class PageProcessor {
	private readonly logger = new Logger(PageProcessor.name);

	constructor(
		private readonly contentExtractionService: ContentExtractionService,
		private readonly crawlersService: CrawlersService,
		private readonly cacheService: CacheService
	) { }

	/**
	 * Обработка всех страниц сайта через потоковый pipeline.
	 * Выполняет параллельную загрузку с контролем concurrency, проверку кэша,
	 * генерацию summaries батчами и сохранение результатов в Redis.
	 * @param hostname - Hostname сайта для обработки
	 * @param modelId - ID модели LLM для генерации и ключа кэша
	 * @param llmProvider - Провайдер LLM для генерации summaries
	 * @param batchSize - Размер батча для генерации summaries
	 * @param limit - Максимальное количество URLs для обработки
	 * @param concurrency - Максимальное количество параллельных запросов (default: 10)
	 * @param onProgress - Callback для отслеживания прогресса (processed, total)
	 * @returns Массив обработанных страниц (успешные и с ошибками)
	 */
	public async processPages(
		hostname: string,
		modelId: string,
		llmProvider: AbstractLlmService,
		batchSize: number,
		limit?: number,
		concurrency: number = 10,
		onProgress?: (processed: number, total: number) => void
	): Promise<ProcessedPage[]> {
		const allPages: ProcessedPage[] = [];
		let processedCount = 0;

		const urlStream = this.urlProvider(hostname, limit);

		for await (const batchUrls of this.batcher(urlStream, batchSize)) {
			this.logger.debug(`Processing batch of ${batchUrls.length} URLs`);

			const fetchedPages = await this.parallelMap(batchUrls, url => this.fetchContent(url), concurrency);
			const checkedPages = await Promise.all(fetchedPages.map(page => this.checkCache(page, modelId, hostname)));

			await this.generateBatchSummary(checkedPages, llmProvider);
			await Promise.all(checkedPages.map(page => this.saveCache(page, modelId, hostname)));

			const validPages = checkedPages.filter((p): p is ProcessedPage => p !== undefined && p !== null);
			allPages.push(...validPages);
			processedCount += validPages.length;

			if (onProgress) {
				onProgress(processedCount, limit || processedCount);
			}

			this.logger.debug(`Processed ${processedCount} pages so far`);
		}

		return allPages;
	}

	/**
	 * Генерация общего описания сайта с кэшированием в Redis.
	 * Использует специальное поле '__description__' в HASH для кэша description.
	 * @param modelId - ID модели LLM для построения ключа кэша
	 * @param hostname - Hostname сайта
	 * @param llmProvider - Провайдер LLM для генерации description
	 * @param successPages - Массив успешно обработанных страниц с summaries
	 * @returns Общее описание сайта
	 */
	public async processDescription(
		modelId: string,
		hostname: string,
		llmProvider: AbstractLlmService,
		successPages: ProcessedPage[]
	): Promise<string> {
		const hashKey = this.buildSummaryHashKey(modelId, hostname);
		return this.cacheService.get(hashKey, '__description__', async () => {
			this.logger.debug(`Generating description for ${hostname} (cache miss)`);
			return llmProvider.generateDescription(successPages);
		});
	}

	/**
	 * Async generator для получения URLs из sitemap.
	 * @param hostname - Hostname сайта
	 * @param limit - Максимальное количество URLs
	 * @yields URL страницы
	 */
	private async* urlProvider(hostname: string, limit?: number): AsyncGenerator<string> {
		const urls = await this.crawlersService.getAllSitemapUrls(hostname);
		const limitedUrls = limit ? urls.slice(0, limit) : urls;
		for (const url of limitedUrls) {
			yield url;
		}
	}

	/**
	 * Извлечение title и content из URL.
	 * @param url - URL страницы для извлечения контента
	 * @returns ProcessedPage.success с контентом или ProcessedPage.failure с ошибкой
	 */
	private async fetchContent(url: string): Promise<ProcessedPage> {
		try {
			const { title, content } = await this.contentExtractionService.extractContent(url);
			return ProcessedPage.success(url, title, content);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return ProcessedPage.failure(url, message);
		}
	}

	/**
	 * Проверка наличия summary в Redis кэше.
	 * Если найден, возвращает ProcessedPage с заполненным summary.
	 * @param page - Страница для проверки кэша
	 * @param modelId - ID модели для построения ключа кэша
	 * @param hostname - Hostname для построения ключа кэша
	 * @returns Страница с summary из кэша или исходная страница
	 */
	private async checkCache(page: ProcessedPage, modelId: string, hostname: string): Promise<ProcessedPage> {
		if (page.isFailure()) {
			return page;
		}

		try {
			const hashKey = this.buildSummaryHashKey(modelId, hostname);
			const { path: pathname } = this.parseUrl(page.url);
			const cached = await this.cacheService.get(hashKey, pathname);

			if (cached) {
				try {
					const data = JSON.parse(cached) as CachedPageData;
					return ProcessedPage.success(page.url, data.title, page.content, data.summary);
				} catch {
					return page;
				}
			}

			return page;
		} catch {
			return page;
		}
	}

	/**
	 * Сохранение summary страницы в Redis кэш.
	 * Сохраняет только успешные страницы с заполненным summary.
	 * @param page - Страница для сохранения в кэш
	 * @param modelId - ID модели для построения ключа кэша
	 * @param hostname - Hostname для построения ключа кэша
	 */
	private async saveCache(page: ProcessedPage, modelId: string, hostname: string): Promise<void> {
		if (page.isFailure() || !page.summary) {
			return;
		}

		const hashKey = this.buildSummaryHashKey(modelId, hostname);
		const { path: pathname } = this.parseUrl(page.url);
		const value = JSON.stringify({ title: page.title, summary: page.summary });
		await this.cacheService.set(hashKey, pathname, value);
	}

	/**
	 * Генерация summaries для батча страниц через LLM провайдер.
	 * Обрабатывает только успешные страницы без summary.
	 * Мутирует объекты страниц, заполняя поле summary.
	 * @param pages - Массив страниц для генерации summaries
	 * @param llmProvider - Провайдер LLM для генерации
	 */
	private async generateBatchSummary(pages: ProcessedPage[], llmProvider: AbstractLlmService): Promise<void> {
		const validPages = pages.filter(p => p && p.isSuccess() && !p.summary);

		if (validPages.length === 0) {
			return;
		}

		const summaries = await llmProvider.generateBatchSummaries(validPages);

		for (let i = 0; i < validPages.length; i++) {
			validPages[i].summary = summaries[i];
		}
	}

	/**
	 * Generic async generator для разбиения потока на батчи.
	 * @param iterable - AsyncIterable источник элементов
	 * @param batchSize - Размер батча
	 * @yields Массив элементов размером до batchSize
	 */
	private async* batcher<T>(iterable: AsyncIterable<T>, batchSize: number): AsyncGenerator<T[]> {
		let batch: T[] = [];

		for await (const item of iterable) {
			batch.push(item);
			if (batch.length >= batchSize) {
				yield batch;
				batch = [];
			}
		}

		if (batch.length > 0) {
			yield batch;
		}
	}

	/**
	 * Параллельное выполнение async операций с ограничением concurrency.
	 * Каждый элемент обрабатывается через fn, результаты возвращаются в исходном порядке.
	 * @param items - Массив элементов для обработки
	 * @param fn - Async функция для обработки каждого элемента
	 * @param concurrency - Максимальное количество одновременных операций
	 * @returns Массив результатов в порядке исходных элементов
	 */
	private async parallelMap<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency: number): Promise<R[]> {
		const results = Array<R>(items.length);
		const executing: Promise<void>[] = [];

		for (let i = 0; i < items.length; i++) {
			const index = i;
			const promise = fn(items[i])
				.then((result) => {
					results[index] = result;
				})
				.catch((error) => {
					console.error(`Unexpected error in parallelMap at index ${index}:`, error);
				})
				.finally(() => {
					void executing.splice(executing.indexOf(promise), 1);
				});

			executing.push(promise);

			if (executing.length >= concurrency) {
				await Promise.race(executing);
			}
		}

		await Promise.all(executing);
		return results;
	}

	/**
	 * Построить ключ для HASH в Redis с парсингом hostname.
	 * Формат: `summary:{modelId}:{hostname}`
	 * @param modelId - ID модели LLM
	 * @param hostnameOrUrl - Hostname или полный URL (hostname будет извлечен)
	 * @returns Ключ Redis HASH для кэша summaries
	 */

	private buildSummaryHashKey(modelId: string, hostnameOrUrl: string): string {
		const { hostname } = this.parseUrl(hostnameOrUrl);
		return `summary:${modelId}:${hostname}`;
	}

	/**
	 * Парсинг URL на hostname и path (pathname).
	 * @param url - Полный URL или hostname
	 * @returns Объект с hostname и path
	 */
	private parseUrl(url: string): { hostname: string; path: string } {
		const urlObj = new URL(url);
		return {
			hostname: urlObj.hostname,
			path: urlObj.pathname
		};
	}
}

export { PageProcessor };
