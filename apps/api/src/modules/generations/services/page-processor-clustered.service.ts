import { Injectable, Logger } from '@nestjs/common';
import { ContentExtractionService } from '@/modules/content/services/content-extraction.service';
import { CacheService } from '@/modules/generations/services/cache.service';
import { EmbeddingService } from '@/modules/generations/services/models/embedding.service';
import { RequestQueueService } from '@/modules/generations/services/request-queue/request-queue.service';
import { CacheEntry } from '@/modules/generations/interfaces/cache-entry.interface';
import { ClusterPage } from '@/modules/generations/models/cluster-page.model';
import { AppConfigService } from '@/config/config.service';
import { PageProcessorBase } from '@/modules/generations/services/page-processor.base';

interface PageVector {
	path: string;
	vector: number[];
}

@Injectable()
class PageProcessorClustered extends PageProcessorBase {
	protected readonly logger = new Logger(PageProcessorClustered.name);

	constructor(
		contentExtractionService: ContentExtractionService,
		private readonly cacheService: CacheService,
		private readonly embeddingService: EmbeddingService,
		private readonly configService: AppConfigService,
		private readonly requestQueue: RequestQueueService
	) {
		super(contentExtractionService);
	}

	public async processPages(
		hostname: string,
		modelId: string,
		urls: string[],
		onProgress?: (processed: number, total: number, batchPages: ClusterPage[]) => Promise<void>
	): Promise<PageVector[]> {
		const hashKey = this.buildHashKey(modelId, hostname);

		const total = urls.length;

		const allPaths = urls.map(url => this.parseUrl(url).path);
		const allCached = allPaths.length > 0
			? await this.cacheService.hmget(hashKey, allPaths.map(p => `vectors:${p}`))
			: [];

		const cachedVectors: PageVector[] = [];
		const urlsToFetch: string[] = [];

		for (let i = 0; i < urls.length; i++) {
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
			urlsToFetch.push(urls[i]);
		}

		this.logger.log(`Cache hits: ${cachedVectors.length}, URLs to fetch: ${urlsToFetch.length}`);

		let processed = cachedVectors.length;
		const pendingPages: ClusterPage[] = [];
		const newVectors: PageVector[] = [];

		const flushEmbeddings = async () => {
			if (pendingPages.length === 0) return;
			const pages = pendingPages.splice(0);
			for (let offset = 0; offset < pages.length; offset += this.configService.embedding.batchSize) {
				const chunk = pages.slice(offset, offset + this.configService.embedding.batchSize);
				const embeddings = await this.requestQueue.embed(modelId, () =>
					this.embeddingService.embedTexts(chunk.map(p => p.text)));
				for (let j = 0; j < chunk.length; j++) {
					const { path, text, title } = chunk[j];
					const entry: CacheEntry = {
						title,
						summary: null,
						text,
						vector: embeddings[j],
						embeddingModel: this.configService.embedding.model
					};
					await this.cacheService.set(hashKey, `vectors:${path}`, JSON.stringify(entry));
					newVectors.push({ path, vector: embeddings[j] });
				}
			}
		};

		// Crawl all URLs concurrently through the queue (queue manages concurrency)
		await Promise.all(urlsToFetch.map(async (url) => {
			const page = await this.requestQueue.crawl(() => this.fetchClusterPage(url));
			if (page.isSuccess()) pendingPages.push(page);
			processed++;
			if (onProgress) await onProgress(processed, total, [page]);
			if (pendingPages.length >= this.configService.embedding.batchSize) await flushEmbeddings();
		}));

		await flushEmbeddings();

		return [...cachedVectors, ...newVectors];
	}

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
				// skip corrupt entries
			}
		}
		return results;
	}

	private async fetchClusterPage(url: string): Promise<ClusterPage> {
		const { path } = this.parseUrl(url);
		try {
			const { title, content } = await this.fetchContent(url);
			return ClusterPage.success(path, title, content);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return ClusterPage.failure(url, message);
		}
	}

	private kMeans(vectors: number[][], k: number, maxIterations = 100): number[] {
		const dim = vectors[0].length;
		let centroids = vectors.slice(0, k).map(v => [...v]);
		let assignments = new Array<number>(vectors.length).fill(0);

		for (let iter = 0; iter < maxIterations; iter++) {
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

			const changed = newAssignments.some((a, i) => a !== assignments[i]);
			assignments = newAssignments;
			if (!changed) break;

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
}

export { PageProcessorClustered };
export type { PageVector };
