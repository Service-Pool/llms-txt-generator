import { Injectable, Logger } from '@nestjs/common';
import { ProcessedPage } from '@/modules/generations/models/processed-page.model';
import { AbstractLlmService } from '@/modules/generations/services/models/abstractLlm.service';
import { ContentExtractionService } from '@/modules/content/services/content-extraction.service';
import { CrawlersService } from '@/modules/crawlers/services/crawlers.service';
import { CacheService } from '@/modules/generations/services/cache.service';
import { RequestQueueService } from '@/modules/generations/services/request-queue/request-queue.service';
import { CacheEntry } from '@/modules/generations/interfaces/cache-entry.interface';

@Injectable()
class PageProcessorFlat {
	private readonly logger = new Logger(PageProcessorFlat.name);

	constructor(
		private readonly contentExtractionService: ContentExtractionService,
		private readonly crawlersService: CrawlersService,
		private readonly cacheService: CacheService,
		private readonly requestQueue: RequestQueueService
	) { }

	public async processPages(
		hostname: string,
		modelId: string,
		llmProvider: AbstractLlmService,
		batchSize: number | null,
		limit?: number,
		onProgress?: (processed: number, total: number, batchPages: ProcessedPage[]) => void | Promise<void>
	): Promise<ProcessedPage[]> {
		const allPages: ProcessedPage[] = [];
		let processedCount = 0;

		const urls = await this.crawlersService.getAllSitemapUrls(hostname);
		const allUrls = limit ? urls.slice(0, limit) : urls;
		const hashKey = this.buildHashKey(modelId, hostname);

		let pendingPages: ProcessedPage[] = [];

		const flushSummaries = async () => {
			if (pendingPages.length === 0) return;
			await this.generateBatchSummary(pendingPages, llmProvider);
			await Promise.all(pendingPages.map(page => this.saveCache(page, modelId, hostname)));
			allPages.push(...pendingPages);
			this.logger.debug(`Flushed ${pendingPages.length} summaries, total processed: ${processedCount}`);
			pendingPages = [];
		};

		// Check cache for all URLs in chunks to avoid memory pressure
		const CHUNK = 200;
		for (let i = 0; i < allUrls.length; i += CHUNK) {
			const chunkUrls = allUrls.slice(i, i + CHUNK);

			const cacheChecks = await Promise.all(chunkUrls.map(async (url) => {
				const { path: pathname } = this.parseUrl(url);
				const cached = await this.cacheService.get(hashKey, pathname);
				return { url, cached };
			}));

			const urlsToFetch: string[] = [];

			for (const { url, cached } of cacheChecks) {
				if (cached) {
					try {
						const data = JSON.parse(cached) as CacheEntry;
						if (data.summary) {
							pendingPages.push(ProcessedPage.success(url, data.title ?? '', data.text, data.summary));
							continue;
						}
					} catch { /* fall through */ }
				}
				urlsToFetch.push(url);
			}

			if (urlsToFetch.length > 0) {
				const fetched = await Promise.all(
					urlsToFetch.map(async (url) => {
						const page = await this.requestQueue.crawl(() => this.fetchContent(url));
						processedCount++;
						if (onProgress) await onProgress(processedCount, allUrls.length, [page]);
						return page;
					})
				);
				pendingPages.push(...fetched);
			}

			if (batchSize !== null && pendingPages.length >= batchSize) await flushSummaries();
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

	private async fetchContent(url: string): Promise<ProcessedPage> {
		try {
			const { title, content } = await this.contentExtractionService.extractContent(url);
			return ProcessedPage.success(url, title, content);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.warn(`Failed to fetch ${url}: ${message}`);
			return ProcessedPage.failure(url, message);
		}
	}

	private async saveCache(page: ProcessedPage, modelId: string, hostname: string): Promise<void> {
		if (page.isFailure() || !page.summary) return;

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
		if (validPages.length === 0) return;

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
