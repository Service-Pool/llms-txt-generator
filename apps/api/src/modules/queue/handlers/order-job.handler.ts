import { AiModelsConfigService } from '@/modules/ai-models/services/ai-models-config.service';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { LLMProviderFactory } from '@/modules/generations/services/llm-provider-factory.service';
import { LlmsTxtFormatter } from '@/modules/generations/utils/llms-txt-formatter';
import { Order } from '@/modules/orders/entities/order.entity';
import { OrdersService } from '@/modules/orders/services/orders.service';
import { OrderStatus } from '@/enums/order-status.enum';
import { PageProcessor } from '@/modules/generations/services/page-processor.service';
import { Repository } from 'typeorm';

/**
 * Generation Job Handler
 * Обрабатывает задания генерации llms.txt из очереди BullMQ
 *
 * Алгоритм (УПРОЩЕННЫЙ - БЕЗ snapshot):
 * 1. Загрузить Order
 * 2. Получить конфигурацию модели
 * 3. Обновить статус на PROCESSING
 * 4. Получить список URLs из sitemap НА ЛЕТУ
 * 5. Обработать страницы батчами:
 *    - Извлечь контент НА ЛЕТУ
 *    - Вычислить hash
 *    - Проверить кэш
 *    - Генерация через LLM при MISS
 * 6. Сгенерировать описание сайта
 * 7. Форматировать llms.txt
 * 8. Сохранить результат
 * 9. Обновить статус на COMPLETED
 */
@Injectable()
class OrderJobHandler {
	private readonly logger = new Logger(OrderJobHandler.name);

	constructor(
		private readonly aiModelsConfigService: AiModelsConfigService,
		private readonly llmProviderFactory: LLMProviderFactory,
		private readonly pageProcessor: PageProcessor,
		private readonly ordersService: OrdersService,
		@InjectRepository(Order) private readonly orderRepository: Repository<Order>
	) { }

	/**
	 * Main job handler
	 */
	public async handle(job: Job<{ orderId: number }>): Promise<void> {
		this.logger.log(`Handling job ${job.id}, data: ${JSON.stringify(job.data)}`);

		const { orderId } = job.data;

		if (!orderId) {
			throw new Error(`Job ${job.id} has no orderId in data: ${JSON.stringify(job.data)}`);
		}

		// 1. Загрузить Order (БЕЗ relations!)
		const order = await this.orderRepository.findOne({
			where: { id: orderId }
		});

		if (!order) {
			throw new Error(`Order ${orderId} not found`);
		}

		if (!order.modelId) {
			throw new Error(`Order ${orderId} has no modelId`);
		}

		// Получить конфигурацию модели
		const modelConfig = this.aiModelsConfigService.getModelById(order.modelId);
		const batchSize = modelConfig.batchSize;
		const provider = await this.llmProviderFactory.getProvider(order.modelId);

		// 2. Обновить статус на PROCESSING
		await this.ordersService.updateOrderStatus(orderId, OrderStatus.PROCESSING);
		await job.updateProgress({});

		try {
			this.logger.log(`Processing order ${orderId} with batch size ${batchSize}`);

			// 3-5. Потоковая обработка всех страниц
			const allPages = await this.pageProcessor.processPages(
				order.hostname,
				order.modelId,
				provider,
				batchSize,
				order.totalUrls,
				10,
				async (processed, total, batchPages) => {
					// Логировать ошибки батча
					const failedPages = batchPages.filter(p => p.isFailure());
					for (const page of failedPages) {
						await this.ordersService.addError(orderId, `Failed to process ${page.url}: ${page.error}`);
					}

					// Обновить прогресс
					await this.ordersService.updateProgress(orderId, processed);
					await job.updateProgress({});
					this.logger.debug(`Progress: ${processed}/${total} URLs processed`);
				}
			);

			const successPages = allPages.filter(p => p.isSuccess());

			// 6. Генерация Description сайта (с кэшем)
			this.logger.log(`Generating website description for order ${orderId}`);

			const description = await this.pageProcessor.processDescription(
				order.modelId,
				order.hostname,
				provider,
				successPages
			);

			// 7. Форматирование llms.txt
			const output = LlmsTxtFormatter.format(order.hostname, description, successPages);

			// 8-9. Сохранение результата
			await this.orderRepository.update(orderId, {
				output,
				status: OrderStatus.COMPLETED,
				completedAt: new Date()
			});

			await job.updateProgress({});

			this.logger.log(`Order ${orderId} completed successfully with ${successPages.length} pages`);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			await this.ordersService.updateOrderStatus(orderId, OrderStatus.FAILED);
			await this.ordersService.addError(orderId, errorMessage);

			this.logger.error(`Order ${orderId} failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
			throw error;
		}
	}
}

export { OrderJobHandler };
