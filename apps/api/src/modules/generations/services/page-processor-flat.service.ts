import { Injectable, Logger } from '@nestjs/common';
import { ProcessedPage } from '@/modules/generations/models/processed-page.model';
import { AbstractLlmService } from '@/modules/generations/services/models/abstractLlm.service';
import { ContentExtractionService } from '@/modules/content/services/content-extraction.service';
import { CrawlersService } from '@/modules/crawlers/services/crawlers.service';
import { CacheService } from '@/modules/generations/services/cache.service';
import { CacheEntry } from '@/modules/generations/interfaces/cache-entry.interface';
import { Utils } from '@/utils/utils';
import { AdaptiveLimit } from '@/utils/adaptive-limit';

/**
 * Сервис потоковой обработки страниц для Flat стратегии.
 * Pipeline: fetch → cache check → batch LLM summary → save cache
 */
@Injectable()
class PageProcessorFlat {
	private readonly logger = new Logger(PageProcessorFlat.name);
	private static readonly FETCH_MAX_ATTEMPTS = 5;

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
		crawlLimit: AdaptiveLimit,
		limit?: number,
		onProgress?: (processed: number, total: number, batchPages: ProcessedPage[]) => void | Promise<void>
	): Promise<ProcessedPage[]> {
		const allPages: ProcessedPage[] = [];
		let processedCount = 0;

		const urls = await this.crawlersService.getAllSitemapUrls(hostname);
		const allUrls = limit ? urls.slice(0, limit) : urls;
		const hashKey = this.buildHashKey(modelId, hostname);

		// Краулинг чанками по crawlLimit.value — адаптируется после каждого чанка.
		// LLM суммаризация — по batchSize страниц за раз.
		let pendingPages: ProcessedPage[] = [];

		const flushSummaries = async () => {
			if (pendingPages.length === 0) return;
			await this.generateBatchSummary(pendingPages, llmProvider);
			await Promise.all(pendingPages.map(page => this.saveCache(page, modelId, hostname)));
			allPages.push(...pendingPages);
			processedCount += pendingPages.length;
			if (onProgress) {
				await onProgress(processedCount, allUrls.length, pendingPages);
			}
			this.logger.debug(`Processed ${processedCount} pages so far`);
			pendingPages = [];
		};

		for (let i = 0; i < allUrls.length;) {
			const crawlChunkSize = crawlLimit.value;
			const chunkUrls = allUrls.slice(i, i + crawlChunkSize);
			i += chunkUrls.length;

			this.logger.debug(`Processing chunk of ${chunkUrls.length} URLs`);

			const cacheChecks = await Promise.all(chunkUrls.map(async (url) => {
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

			let fetchedPages: ProcessedPage[] = [];
			if (urlsToFetch.length > 0) {
				fetchedPages = await Utils.parallelMap(urlsToFetch, async (url) => {
					const page = await this.fetchContent(url, crawlLimit);
					if (page.isSuccess()) crawlLimit.onSuccess();
					return page;
				}, crawlChunkSize);
			}

			pendingPages.push(...cachedPages, ...fetchedPages);
			if (pendingPages.length >= batchSize) {
				await flushSummaries();
			}
		}

		await flushSummaries();

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
			const summaries = successPages.map(p => p.summary ?? p.title);
			return llmProvider.generateDescription(summaries);
		});
	}

	private async fetchContent(url: string, crawlLimit: AdaptiveLimit, attempt = 1): Promise<ProcessedPage> {
		const maxAttempts = PageProcessorFlat.FETCH_MAX_ATTEMPTS;
		try {
			const { title, content } = await this.contentExtractionService.extractContent(url);
			return ProcessedPage.success(url, title, content);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			const isRetryable = message.includes('HTTP 429') || message.includes('HTTP 503') || message.includes('timeout');

			if (isRetryable && attempt < maxAttempts) {
				crawlLimit.onError();
				const delayMs = Math.min(1000 * 2 ** (attempt - 1), 30000);
				this.logger.warn(`Retry ${attempt}/${maxAttempts - 1} for ${url} in ${delayMs}ms: ${message}`);
				await new Promise(resolve => setTimeout(resolve, delayMs));
				return this.fetchContent(url, crawlLimit, attempt + 1);
			}

			this.logger.warn(`Failed to fetch ${url} after ${attempt} attempt(s): ${message}`);
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
