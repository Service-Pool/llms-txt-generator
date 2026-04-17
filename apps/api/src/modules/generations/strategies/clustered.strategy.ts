import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IGenerationStrategy } from '@/modules/generations/interfaces/generation-strategy.interface';
import { PageProcessorClustered } from '@/modules/generations/services/page-processor-clustered.service';
import { OrdersService } from '@/modules/orders/services/orders.service';
import { ClusterPage } from '@/modules/generations/models/cluster-page.model';
import type { Order } from '@/modules/orders/entities/order.entity';
import { AbstractLlmService } from '@/modules/generations/services/models/abstractLlm.service';

type ClusterSection = Awaited<ReturnType<AbstractLlmService['generateClusterContent']>>;

@Injectable()
class ClusteredStrategy implements IGenerationStrategy {
	private readonly logger = new Logger(ClusteredStrategy.name);

	constructor(
		private readonly pageProcessor: PageProcessorClustered,
		private readonly ordersService: OrdersService
	) {}

	public async execute(order: Order, provider: AbstractLlmService, _batchSize: number, job: Job): Promise<string> {
		// 1. Краулинг + векторизация
		this.logger.log(`Starting crawl + vectorization for order ${order.id}`);
		const pageVectors = await this.pageProcessor.processPages(
			order.hostname,
			order.modelId,
			order.totalUrls,
			10,
			async (processed, total, batchPages) => {
				for (const page of batchPages.filter(p => p.isFailure())) {
					await this.ordersService.addError(order.id, `Failed to process ${page.path}: ${page.error}`);
				}
				await this.ordersService.updateProgress(order.id, processed);
				await job.updateProgress({});
				this.logger.debug(`Crawl progress: ${processed}/${total}`);
			}
		);

		this.logger.log(`Vectorized ${pageVectors.length} pages for order ${order.id}`);

		// 2. Кластеризация
		const clusterCount = Math.max(1, Math.round(Math.sqrt(pageVectors.length / 2)));
		const clusters = this.pageProcessor.clusterPages(pageVectors, clusterCount);
		this.logger.log(`Clustered into ${clusters.size} clusters for order ${order.id}`);

		// 3. Генерация секций по кластерам
		const allSections: ClusterSection[] = [];

		for (const [clusterId, paths] of clusters) {
			this.logger.debug(`Processing cluster ${clusterId} with ${paths.length} pages`);

			const rawPages = await this.pageProcessor.getClusterTexts(order.hostname, order.modelId, paths);
			if (rawPages.length === 0) continue;

			const clusterPages = rawPages.map(p => ClusterPage.success(p.path, p.title, p.text));
			const section = await provider.generateClusterContent(clusterPages);
			allSections.push(section);

			await job.updateProgress({});
		}

		// 4. Описание сайта на основе описаний кластеров
		const sectionSummaries = allSections.map(s => s.description);
		const siteDescription = await provider.generateDescription(sectionSummaries);

		// 5. Сборка llms.txt
		const host = new URL(order.hostname).hostname;
		return this.formatOutput(host, siteDescription, allSections);
	}

	private formatOutput(host: string, description: string, sections: ClusterSection[]): string {
		const lines: string[] = [];

		lines.push(`# ${host}`);
		lines.push(description);
		lines.push('');

		for (const section of sections) {
			const sectionSlug = section.section_name;

			lines.push(`## ${this.slugToTitle(sectionSlug)}`);
			lines.push(section.description);
			lines.push('');

			for (const page of section.pages) {
				const url = `/${sectionSlug}/${page.filename}.md`;
				lines.push(`- [${page.title}](${url}): ${page.summary}`);
				lines.push('<!-- md -->');
				lines.push(page.md_content);
				lines.push('<!-- /md -->');
			}

			lines.push('');
		}

		return lines.join('\n');
	}

	private slugToTitle(slug: string): string {
		return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
	}
}

export { ClusteredStrategy };
