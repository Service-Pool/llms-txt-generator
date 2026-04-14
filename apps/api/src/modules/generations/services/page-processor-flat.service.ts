import { Injectable, Logger } from '@nestjs/common';
import { ProcessedPage } from '@/modules/generations/models/processed-page.model';
import { AbstractLlmService } from '@/modules/generations/services/models/abstractLlm.service';
import { ContentExtractionService } from '@/modules/content/services/content-extraction.service';
import { CrawlersService } from '@/modules/crawlers/services/crawlers.service';
import { CacheService } from '@/modules/generations/services/cache.service';
import { CacheEntry } from '@/modules/generations/interfaces/cache-entry.interface';

/**
 * Сервис потоковой обработки страниц для Flat стратегии.
 * Pipeline: fetch → cache check → batch LLM summary → save cache
 */
@Injectable()
class PageProcessorFlat {
	private readonly logger = new Logger(PageProcessorFlat.name);

	constructor(
		private readonly contentExtractionService: ContentExtractionService,
		private readonly crawlersService: CrawlersService,
		private readonly cacheService: CacheService
	) { }

	public async processPages(
		hostname: string,
		modelId: string,
		llmProvider: AbstractLlmService,
		batchSize: number,
		limit?: number,
		concurrency: number = 10,
		onProgress?: (processed: number, total: number, batchPages: ProcessedPage[]) => void | Promise<void>
	): Promise<ProcessedPage[]> {
		const allPages: ProcessedPage[] = [];
		let processedCount = 0;

		const urlStream = this.urlProvider(hostname, limit);

		for await (const batchUrls of this.batcher(urlStream, batchSize)) {
			this.logger.debug(`Processing batch of ${batchUrls.length} URLs`);

			const hashKey = this.buildHashKey(modelId, hostname);
			const cacheChecks = await Promise.all(batchUrls.map(async (url) => {
				const { path: pathname } = this.parseUrl(url);
				const cached = await this.cacheService.get(hashKey, pathname);
				return { url, cached };
			}));

			const cachedPages: ProcessedPage[] = [];
			const urlsToFetch: string[] = [];

			for (const { url, cached } of cacheChecks) {
				if (cached) {
					try {
						const data = JSON.parse(cached) as CacheEntry;
						if (data.summary) {
							cachedPages.push(ProcessedPage.success(url, data.title ?? '', data.text, data.summary));
						} else {
							urlsToFetch.push(url);
						}
					} catch {
						urlsToFetch.push(url);
					}
				} else {
					urlsToFetch.push(url);
				}
			}

			this.logger.debug(`Cache hits: ${cachedPages.length}, URLs to fetch: ${urlsToFetch.length}`);

			const fetchedPages = urlsToFetch.length > 0
				? await this.parallelMap(urlsToFetch, url => this.fetchContent(url), concurrency)
				: [];

			const allBatchPages = [...cachedPages, ...fetchedPages];

			await this.generateBatchSummary(allBatchPages, llmProvider);
			await Promise.all(allBatchPages.map(page => this.saveCache(page, modelId, hostname)));

			const batchPages = allBatchPages.filter((p): p is ProcessedPage => p !== undefined && p !== null);
			allPages.push(...batchPages);
			processedCount += batchPages.length;

			if (onProgress) {
				await onProgress(processedCount, limit || processedCount, batchPages);
			}

			this.logger.debug(`Processed ${processedCount} pages so far`);
		}

		return allPages;
	}

	public async processDescription(
		modelId: string,
		hostname: string,
		llmProvider: AbstractLlmService,
		successPages: ProcessedPage[]
	): Promise<string> {
		const hashKey = this.buildHashKey(modelId, hostname);
		return this.cacheService.get(hashKey, '__description__', async () => {
			this.logger.debug(`Generating description for ${hostname} (cache miss)`);
			return llmProvider.generateDescription(successPages);
		});
	}

	private async* urlProvider(hostname: string, limit?: number): AsyncGenerator<string> {
		const urls = await this.crawlersService.getAllSitemapUrls(hostname);
		const limitedUrls = limit ? urls.slice(0, limit) : urls;
		for (const url of limitedUrls) {
			yield url;
		}
	}

	private async fetchContent(url: string): Promise<ProcessedPage> {
		try {
			const { title, content } = await this.contentExtractionService.extractContent(url);
			return ProcessedPage.success(url, title, content);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return ProcessedPage.failure(url, message);
		}
	}

	private async saveCache(page: ProcessedPage, modelId: string, hostname: string): Promise<void> {
		if (page.isFailure() || !page.summary) {
			return;
		}

		const hashKey = this.buildHashKey(modelId, hostname);
		const { path: pathname } = this.parseUrl(page.url);
		const entry: CacheEntry = {
			title: page.title,
			summary: page.summary,
			text: page.content,
			vector: null,
			embeddingModel: null
		};
		await this.cacheService.set(hashKey, pathname, JSON.stringify(entry));
	}

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

	private async parallelMap<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency: number): Promise<R[]> {
		const results = Array<R>(items.length);
		const executing: Promise<void>[] = [];

		for (let i = 0; i < items.length; i++) {
			const index = i;
			const promise = fn(items[i])
				.then((result) => { results[index] = result; })
				.catch((error) => { console.error(`Unexpected error in parallelMap at index ${index}:`, error); })
				.finally(() => { void executing.splice(executing.indexOf(promise), 1); });

			executing.push(promise);

			if (executing.length >= concurrency) {
				await Promise.race(executing);
			}
		}

		await Promise.all(executing);
		return results;
	}

	private buildHashKey(modelId: string, hostnameOrUrl: string): string {
		const { hostname } = this.parseUrl(hostnameOrUrl);
		return `summary:${modelId}:${hostname}`;
	}

	private parseUrl(url: string): { hostname: string; path: string } {
		const urlObj = new URL(url);
		return { hostname: urlObj.hostname, path: urlObj.pathname };
	}
}

export { PageProcessorFlat };
