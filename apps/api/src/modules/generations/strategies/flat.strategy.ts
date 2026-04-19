import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IGenerationStrategy } from '@/modules/generations/interfaces/generation-strategy.interface';
import { PageProcessorFlat } from '@/modules/generations/services/page-processor-flat.service';
import { LlmsTxtFormatter } from '@/modules/generations/utils/llms-txt-formatter';
import { OrdersService } from '@/modules/orders/services/orders.service';
import type { Order } from '@/modules/orders/entities/order.entity';
import type { AbstractLlmService } from '@/modules/generations/services/models/abstractLlm.service';

@Injectable()
class FlatStrategy implements IGenerationStrategy {
	private readonly logger = new Logger(FlatStrategy.name);

	constructor(
		private readonly pageProcessor: PageProcessorFlat,
		private readonly ordersService: OrdersService
	) { }

	public async execute(order: Order, provider: AbstractLlmService, batchSize: number, job: Job): Promise<string> {
		const allPages = await this.pageProcessor.processPages(
			order.hostname,
			order.modelId,
			provider,
			batchSize,
			order.totalUrls,
			10,
			async (processed, total, batchPages) => {
				for (const page of batchPages.filter(p => p.isFailure())) {
					await this.ordersService.addError(order.id, `Failed to process ${page.url}: ${page.error}`);
				}
				await this.ordersService.updateProgress(order.id, processed);
				await job.updateProgress({});
				this.logger.debug(`Progress: ${processed}/${total} URLs processed`);
			}
		);

		const successPages = allPages.filter(p => p.isSuccess());

		this.logger.log(`Generating website description for order ${order.id}`);
		const description = await this.pageProcessor.processDescription(
			order.modelId,
			order.hostname,
			provider,
			successPages
		);

		return LlmsTxtFormatter.formatFlat(order.hostname, description, successPages);
	}
}

export { FlatStrategy };
