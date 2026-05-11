import { Injectable, Logger } from '@nestjs/common';
import { ProcessedPage } from '@/modules/generations/models/processed-page.model';
import { AbstractLlmService } from '@/modules/generations/services/models/abstractLlm.service';
import { ContentExtractionService } from '@/modules/content/services/content-extraction.service';
import { CacheService } from '@/modules/generations/services/cache.service';
import { RequestQueueService } from '@/modules/generations/services/request-queue/request-queue.service';
import { CacheEntry } from '@/modules/generations/interfaces/cache-entry.interface';

@Injectable()
class PageProcessorFlat {
	private readonly logger = new Logger(PageProcessorFlat.name);

	constructor(
		private readonly contentExtractionService: ContentExtractionService,
		private readonly cacheService: CacheService,
		private readonly requestQueue: RequestQueueService
	) { }

	public async processPages(
		hostname: string,
		modelId: string,
		llmProvider: AbstractLlmService,
		batchSize: number,
		urls: string[],
		onCrawlProgress?: (processed: number, total: number, batchPages: ProcessedPage[]) => void | Promise<void>,
		onSummarizeProgress?: (summarized: number, total: number) => void | Promise<void>
	): Promise<ProcessedPage[]> {
		const allPages: ProcessedPage[] = [];
		let processedCount = 0;

		const allUrls = urls;
		const hashKey = this.buildHashKey(modelId, hostname);

		// Prefetch all cache entries in one Redis request
		const paths = allUrls.map(url => this.parseUrl(url).path);
		const cachedValues = await this.cacheService.hmget(hashKey, paths);

		const pendingPages: ProcessedPage[] = [];
		const urlsToFetch: string[] = [];
		let cacheHits = 0;
		let contentCacheHits = 0;

		for (let i = 0; i < allUrls.length; i++) {
			const raw = cachedValues[i];
			if (raw) {
				try {
					const data = JSON.parse(raw) as CacheEntry;
					if (data.summary) {
						allPages.push(ProcessedPage.success(allUrls[i], data.title ?? '', data.text, data.summary));
						cacheHits++;
						processedCount++;
						continue;
					}
					if (data.text) {
						pendingPages.push(ProcessedPage.success(allUrls[i], data.title ?? '', data.text));
						contentCacheHits++;
						processedCount++;
						continue;
					}
				} catch { /* fall through */ }
			}
			urlsToFetch.push(allUrls[i]);
		}

		this.logger.log(`Cache hits: ${cacheHits} with summary, ${contentCacheHits} content-only, URLs to fetch: ${urlsToFetch.length}`);
		if (onCrawlProgress && (cacheHits + contentCacheHits) > 0) await onCrawlProgress(processedCount, allUrls.length, []);

		let summarizedCount = cacheHits;
		const totalToSummarize = allUrls.length;
		let flushChain = Promise.resolve();

		let crawlingDone = false;

		const flushSummaries = () => {
			const batch = pendingPages.splice(0);
			if (batch.length === 0) return;
			flushChain = flushChain.then(async () => {
				await this.generateBatchSummary(batch, llmProvider);
				await Promise.all(batch.map(page => this.saveCache(page, modelId, hostname)));
				allPages.push(...batch);
				summarizedCount += batch.length;
				this.logger.debug(`Flushed ${batch.length} summaries, total summarized: ${summarizedCount}/${totalToSummarize}`);
				if (crawlingDone && onSummarizeProgress) await onSummarizeProgress(summarizedCount, totalToSummarize);
			});
		};

		await Promise.all(urlsToFetch.map(async (url) => {
			const page = await this.requestQueue.crawl(() => this.fetchContent(url));
			processedCount++;
			pendingPages.push(page);
			if (page.isSuccess()) await this.saveCache(page, modelId, hostname);
			if (onCrawlProgress) await onCrawlProgress(processedCount, allUrls.length, [page]);
			if (pendingPages.length >= batchSize) flushSummaries();
		}));

		crawlingDone = true;
		flushSummaries();
		if (onSummarizeProgress) await onSummarizeProgress(summarizedCount, totalToSummarize);
		await flushChain;
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
		if (page.isFailure()) return;

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
