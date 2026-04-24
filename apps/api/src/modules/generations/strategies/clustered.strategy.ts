import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IGenerationStrategy } from '@/modules/generations/interfaces/generation-strategy.interface';
import { PageProcessorClustered } from '@/modules/generations/services/page-processor-clustered.service';
import { OrdersService } from '@/modules/orders/services/orders.service';
import { CacheService } from '@/modules/generations/services/cache.service';
import { ClusterPage } from '@/modules/generations/models/cluster-page.model';
import type { Order } from '@/modules/orders/entities/order.entity';
import { AbstractLlmService } from '@/modules/generations/services/models/abstractLlm.service';
import { LlmsTxtFormatter } from '@/modules/generations/utils/llms-txt-formatter';

type ClusterSection = Awaited<ReturnType<AbstractLlmService['generateClusterContent']>>;

@Injectable()
class ClusteredStrategy implements IGenerationStrategy {
	private readonly logger = new Logger(ClusteredStrategy.name);

	constructor(
		private readonly pageProcessor: PageProcessorClustered,
		private readonly ordersService: OrdersService,
		private readonly cacheService: CacheService
	) {}

	public async execute(order: Order, provider: AbstractLlmService, _batchSize: number, job: Job, attempt: number): Promise<string> {
		const hashKey = this.pageProcessor.buildHashKey(order.modelId, order.hostname);
		const setProgress = (fields: Omit<Parameters<typeof this.ordersService.updateProgress>[1], 'attempt'>) =>
			this.ordersService.updateProgress(order.id, { ...fields, attempt });

		// 1. Краулинг
		this.logger.log(`Starting crawl + vectorization for order ${order.id}`);
		await setProgress({ step: 'Crawling', processedUrls: 0, clusterCurrent: null, clusterTotal: null, pageCurrent: null, pageTotal: null });
		await job.updateProgress({});
		const pageVectors = await this.pageProcessor.processPages(
			order.hostname,
			order.modelId,
			order.totalUrls,
			10,
			async (processed, total, batchPages) => {
				for (const page of batchPages.filter(p => p.isFailure())) {
					await this.ordersService.addError(order.id, `Failed to process ${page.path}: ${page.error}`);
				}
				await setProgress({ step: 'Crawling', processedUrls: processed, clusterCurrent: null, clusterTotal: null, pageCurrent: null, pageTotal: null });
				await job.updateProgress({});
				this.logger.debug(`Crawl progress: ${processed}/${total}`);
			}
		);

		// 2. Векторизация завершена
		this.logger.log(`Vectorized ${pageVectors.length} pages for order ${order.id}`);
		await setProgress({ step: 'Vectorizing', processedUrls: pageVectors.length, clusterCurrent: null, clusterTotal: null, pageCurrent: 1, pageTotal: 1 });
		await job.updateProgress({});

		// 3. Кластеризация
		await setProgress({ step: 'Clustering', processedUrls: pageVectors.length, clusterCurrent: null, clusterTotal: null, pageCurrent: 0, pageTotal: 1 });
		await job.updateProgress({});

		const clusterCount = Math.max(1, Math.round(Math.sqrt(pageVectors.length / 2)));
		const clusters = this.pageProcessor.clusterPages(pageVectors, clusterCount);
		this.logger.log(`Clustered into ${clusters.size} clusters for order ${order.id}`);

		await setProgress({ step: 'Clustering', processedUrls: pageVectors.length, clusterCurrent: null, clusterTotal: null, pageCurrent: 1, pageTotal: 1 });
		await job.updateProgress({});

		// 4. Генерация секций по кластерам
		const allSections: ClusterSection[] = [];
		const clusterTotal = clusters.size;
		let clusterCurrent = 0;

		for (const [clusterId, paths] of clusters) {
			const cacheField = `clusters:${clusterId}`;
			const cached = await this.cacheService.get(hashKey, cacheField);
			if (cached) {
				this.logger.debug(`Cluster ${clusterId} loaded from cache`);
				allSections.push(JSON.parse(cached) as ClusterSection);
				clusterCurrent++;
				await setProgress({ step: 'Generating', processedUrls: pageVectors.length, clusterCurrent, clusterTotal, pageCurrent: null, pageTotal: null });
				await job.updateProgress({});
				continue;
			}

			this.logger.debug(`Processing cluster ${clusterId} with ${paths.length} pages`);
			const rawPages = await this.pageProcessor.getClusterTexts(order.hostname, order.modelId, paths);
			if (rawPages.length === 0) continue;

			await setProgress({ step: 'Generating', processedUrls: pageVectors.length, clusterCurrent, clusterTotal, pageCurrent: 0, pageTotal: null });
			await job.updateProgress({});

			const clusterPages = rawPages.map(p => ClusterPage.success(p.path, p.title, p.text));
			const section = await provider.generateClusterContent(clusterPages, async (pageCurrent, pageTotal) => {
				await setProgress({ step: 'Generating', processedUrls: pageVectors.length, clusterCurrent, clusterTotal, pageCurrent, pageTotal });
				await job.updateProgress({});
			});

			for (const filename of section.truncatedPages) {
				await this.ordersService.addError(order.id, `AI truncated md_content for page /${section.section_name}/${filename}.md (MAX_TOKENS)`);
			}

			await this.cacheService.set(hashKey, cacheField, JSON.stringify(section));
			allSections.push(section);
			clusterCurrent++;
			await job.updateProgress({});
		}

		// 5. Сборка
		await setProgress({ step: 'Assembling', processedUrls: pageVectors.length, clusterCurrent: clusterTotal, clusterTotal, pageCurrent: null, pageTotal: null });
		await job.updateProgress({});

		const sectionSummaries = allSections.map(s => s.description);
		const siteDescription = await provider.generateDescription(sectionSummaries);

		// 5. Сборка llms.txt
		const host = new URL(order.hostname).hostname;
		return LlmsTxtFormatter.formatClustered(host, siteDescription, allSections);
	}
}

export { ClusteredStrategy };
