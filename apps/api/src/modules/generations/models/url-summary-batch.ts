import { AiServiceInterface } from '../services/llm/ai-service.interface';
import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { UrlSummary } from './url-summary';

/**
 * Batch of UrlSummary objects with processing capabilities
 *
 * Domain object that encapsulates batch operations for URL summarization
 * using Symfony-style cache pattern: single method that checks cache,
 * generates if needed, caches results, and returns.
 *
 * Separation of concerns:
 * - Batch knows which items need processing (business logic)
 * - LLM service knows what it can process (technical requirements)
 */
export class UrlSummaryBatch {
	private readonly logger = new Logger(UrlSummaryBatch.name);
	private readonly items: UrlSummary[];
	private readonly redis: Redis;

	public constructor(items: UrlSummary[], redis: Redis) {
		this.items = items;
		this.redis = redis;
	}

	/**
	 * Get number of items in this batch
	 */
	get size(): number {
		return this.items.length;
	}

	/**
	 * Load summaries using Symfony cache pattern
	 *
	 * Single method that:
	 * 1. Checks Redis cache (HMGET)
	 * 2. For cache misses: extracts content and generates summaries via LLM
	 * 3. Saves ONLY newly generated items to cache (HMSET)
	 * 4. All items enriched in-place with results
	 *
	 * This pattern prevents writing cached items back to cache,
	 * as only items that went through generation are saved.
	 *
	 * Cache structure: HASH key = cacheKey, field = URL, value = JSON {title, summary}
	 *
	 * @param llmService - AI service for generating summaries
	 * @param cacheKey - Redis HASH key (e.g., "summary:gemini:example.com")
	 * @param cacheTtl - Time-to-live in seconds for cache expiration
	 */
	public async loadSummaries(llmService: AiServiceInterface, cacheKey: string, cacheTtl: number): Promise<void> {
		const urls = this.items.map(s => s.url);
		const cachedValues = await this.redis.hmget(cacheKey, ...urls);

		const itemsToGenerate: UrlSummary[] = [];

		for (let i = 0; i < this.items.length; i++) {
			const item = this.items[i];
			const cached = cachedValues[i];

			if (cached !== null) {
				const data = JSON.parse(cached) as { title: string; summary: string };
				item.setContent(data.title, data.summary);
				this.logger.log(`Cache HIT: ${item.url}`);
			} else {
				itemsToGenerate.push(item);
				this.logger.log(`Cache MISS: ${item.url}`);
			}
		}

		if (itemsToGenerate.length === 0) {
			this.logger.log('All batch items were cached');
			return;
		}

		this.logger.log(`Extracting content for ${itemsToGenerate.length} items`);
		await Promise.all(itemsToGenerate.map(item => item.extract()));

		for (const item of itemsToGenerate) {
			if (item.text) {
				this.logger.log(`Extracted: ${item.title} (${item.text.length} chars)`);
			}
		}

		this.logger.log(`Generating summaries for ${itemsToGenerate.length} items`);
		await llmService.generatePageSummaries(itemsToGenerate);

		const cacheEntries: string[] = [];
		for (const item of itemsToGenerate) {
			if (item.error === null && item.summary) {
				cacheEntries.push(item.url, JSON.stringify(item.toCacheData()));
				this.logger.log(`Cached: ${item.url}`);
			}
		}

		if (cacheEntries.length > 0) {
			await this.redis.hmset(cacheKey, ...cacheEntries);
			await this.redis.expire(cacheKey, cacheTtl);
		}
	}

	/**
	 * Get all items in this batch
	 *
	 * @returns Array of all UrlSummary objects in this batch
	 */
	public getItems(): UrlSummary[] {
		return this.items;
	}
}
