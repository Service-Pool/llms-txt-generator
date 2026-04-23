import { Injectable, Logger } from '@nestjs/common';
import { ContentExtractionService } from '@/modules/content/services/content-extraction.service';
import { CrawlersService } from '@/modules/crawlers/services/crawlers.service';
import { CacheService } from '@/modules/generations/services/cache.service';
import { EmbeddingService } from '@/modules/generations/services/models/embedding.service';
import { CacheEntry } from '@/modules/generations/interfaces/cache-entry.interface';
import { ClusterPage } from '@/modules/generations/models/cluster-page.model';
import { AppConfigService } from '@/config/config.service';
import { parallelMap } from '@/utils/parallel-map';

interface PageVector {
	path: string;
	vector: number[];
}

/**
 * Сервис обработки страниц для Clustered стратегии.
 * Pipeline: fetch → batch vectorize → save cache (text + vector)
 * Суммаризация НЕ выполняется — LLM получает тексты целых кластеров.
 */
@Injectable()
class PageProcessorClustered {
	private readonly logger = new Logger(PageProcessorClustered.name);

	constructor(
		private readonly contentExtractionService: ContentExtractionService,
		private readonly crawlersService: CrawlersService,
		private readonly cacheService: CacheService,
		private readonly embeddingService: EmbeddingService,
		private readonly configService: AppConfigService
	) { }

	/**
	 * Краулит все страницы, векторизует батчами и сохраняет в кэш.
	 * При рестарте пропускает уже закэшированные урлы.
	 * @returns Массив {path, vector} для всех страниц
	 */
	public async processPages(
		hostname: string,
		modelId: string,
		limit?: number,
		concurrency: number = 10,
		onProgress?: (processed: number, total: number, batchPages: ClusterPage[]) => Promise<void>
	): Promise<PageVector[]> {
		const hashKey = this.buildHashKey(modelId, hostname);
		const { batchSize } = this.configService.embedding;

		const urls = await this.crawlersService.getAllSitemapUrls(hostname);
		const limitedUrls = limit ? urls.slice(0, limit) : urls;
		const total = limitedUrls.length;

		// Один hmget для всех URL сразу вместо N последовательных hget
		const allPaths = limitedUrls.map(url => this.parseUrl(url).path);
		const allCached = allPaths.length > 0
			? await this.cacheService.hmget(hashKey, allPaths.map(p => `vectors:${p}`))
			: [];

		const cachedVectors: PageVector[] = [];
		const urlsToFetch: string[] = [];

		for (let i = 0; i < limitedUrls.length; i++) {
			const raw = allCached[i];
			if (raw) {
				try {
					const entry = JSON.parse(raw) as CacheEntry;
					if (entry.vector) {
						cachedVectors.push({ path: allPaths[i], vector: entry.vector });
						continue;
					}
				} catch { /* fall through */ }
			}
			urlsToFetch.push(limitedUrls[i]);
		}

		this.logger.log(`Cache hits: ${cachedVectors.length}, URLs to fetch: ${urlsToFetch.length}`);

		// Батч-центричный pipeline: fetch batch → embed batch → cache batch
		const newVectors: PageVector[] = [];
		let processed = cachedVectors.length;

		for (let i = 0; i < urlsToFetch.length; i += batchSize) {
			const batchUrls = urlsToFetch.slice(i, i + batchSize);

			const batchAll = await parallelMap(batchUrls, url => this.fetchContent(url), concurrency);
			const batchSuccess = batchAll.filter(p => p.isSuccess());

			if (batchSuccess.length > 0) {
				const texts = batchSuccess.map(p => p.text);
				const embeddings = await this.embeddingService.embedTexts(texts);

				for (let j = 0; j < batchSuccess.length; j++) {
					const { path, text, title } = batchSuccess[j];
					const vector = embeddings[j];

					const entry: CacheEntry = {
						title,
						summary: null,
						text,
						vector,
						embeddingModel: this.configService.embedding.model
					};

					await this.cacheService.set(hashKey, `vectors:${path}`, JSON.stringify(entry));
					newVectors.push({ path, vector });
				}
			}

			processed += batchAll.length;
			if (onProgress) {
				await onProgress(processed, total, batchAll);
			}
		}

		return [...cachedVectors, ...newVectors];
	}

	/**
	 * Кластеризует векторы через HSCAN.
	 * Возвращает Map: clusterId → массив path-ов
	 */
	public clusterPages(
		pageVectors: PageVector[],
		clusterCount: number
	): Map<string, string[]> {
		const vectors = pageVectors.map(p => p.vector);
		const assignments = this.kMeans(vectors, clusterCount);

		const clusters = new Map<string, string[]>();
		for (let i = 0; i < pageVectors.length; i++) {
			const clusterId = `${assignments[i]}`;
			if (!clusters.has(clusterId)) clusters.set(clusterId, []);
			clusters.get(clusterId).push(pageVectors[i].path);
		}

		this.logger.log(`Clustered ${pageVectors.length} pages into ${clusters.size} clusters`);
		return clusters;
	}

	/**
	 * Получить тексты страниц кластера из кэша
	 */
	public async getClusterTexts(
		hostname: string,
		modelId: string,
		paths: string[]
	): Promise<ClusterPage[]> {
		const hashKey = this.buildHashKey(modelId, hostname);
		const values = await this.cacheService.hmget(hashKey, paths.map(p => `vectors:${p}`));

		const results: ClusterPage[] = [];
		for (let i = 0; i < paths.length; i++) {
			const raw = values[i];
			if (!raw) continue;
			try {
				const entry = JSON.parse(raw) as CacheEntry;
				results.push(ClusterPage.success(paths[i], entry.title ?? '', entry.text));
			} catch {
				// пропускаем битые записи
			}
		}
		return results;
	}

	private async fetchContent(url: string): Promise<ClusterPage> {
		try {
			const { path } = this.parseUrl(url);
			const { title, content } = await this.contentExtractionService.extractContent(url);
			return ClusterPage.success(path, title, content);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.warn(`Failed to fetch ${url}: ${message}`);
			return ClusterPage.failure(url, message);
		}
	}

	/**
	 * Простой K-means алгоритм.
	 * Возвращает массив cluster id для каждого вектора.
	 */
	private kMeans(vectors: number[][], k: number, maxIterations: number = 100): number[] {
		const dim = vectors[0].length;

		// Инициализация центроидов — первые k векторов
		let centroids = vectors.slice(0, k).map(v => [...v]);
		let assignments = new Array<number>(vectors.length).fill(0);

		for (let iter = 0; iter < maxIterations; iter++) {
			// Назначение каждого вектора ближайшему центроиду
			const newAssignments = vectors.map((v) => {
				let minDist = Infinity;
				let nearest = 0;
				for (let c = 0; c < centroids.length; c++) {
					const dist = 1 - this.cosineSimilarity(v, centroids[c]);
					if (dist < minDist) {
						minDist = dist;
						nearest = c;
					}
				}
				return nearest;
			});

			// Проверка сходимости
			const changed = newAssignments.some((a, i) => a !== assignments[i]);
			assignments = newAssignments;
			if (!changed) break;

			// Пересчёт центроидов
			centroids = Array.from({ length: k }, (_, c) => {
				const members = vectors.filter((_, i) => assignments[i] === c);
				if (members.length === 0) return centroids[c];
				const sum = new Array<number>(dim).fill(0);
				for (const v of members) {
					for (let d = 0; d < dim; d++) sum[d] += v[d];
				}
				return sum.map(s => s / members.length);
			});
		}

		return assignments;
	}

	private cosineSimilarity(a: number[], b: number[]): number {
		let dot = 0, normA = 0, normB = 0;
		for (let i = 0; i < a.length; i++) {
			dot += a[i] * b[i];
			normA += a[i] * a[i];
			normB += b[i] * b[i];
		}
		return dot / (Math.sqrt(normA) * Math.sqrt(normB));
	}

	public buildHashKey(modelId: string, hostnameOrUrl: string): string {
		const { hostname } = this.parseUrl(hostnameOrUrl);
		return `summary:${modelId}:${hostname}`;
	}

	private parseUrl(url: string): { hostname: string; path: string } {
		const urlObj = new URL(url);
		return { hostname: urlObj.hostname, path: urlObj.pathname };
	}
}

export { PageProcessorClustered };
export type { PageVector };
