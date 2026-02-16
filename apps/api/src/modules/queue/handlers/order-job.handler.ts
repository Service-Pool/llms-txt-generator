import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { Order } from '../../orders/entities/order.entity';
import { OrderStatus } from '../../../enums/order-status.enum';
import { AiModelsConfigService } from '../../ai-models/services/ai-models-config.service';
import { CrawlersService } from '../../crawlers/services/crawlers.service';
import { CacheService } from '../../generations/services/cache.service';
import { LLMProviderFactory } from '../../generations/services/llm-provider-factory.service';
import { PageContent } from '../../generations/services/llm-provider.service';
import { PageBatchProcessor } from '../../generations/services/page-processor.service';
import { LlmsTxtFormatter } from '../../generations/utils/llms-txt-formatter';
import { OrdersService } from '../../orders/services/orders.service';
import { StatsService } from '../../stats/services/stats.service';
import { PageProcessingError } from '../../../exceptions/page-processing.exception';
import { ResourceUnavailableError } from '../../../exceptions/resource-unavailable.exception';

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
		private readonly crawlersService: CrawlersService,
		private readonly cacheService: CacheService,
		private readonly llmProviderFactory: LLMProviderFactory,
		private readonly pageBatchProcessor: PageBatchProcessor,
		private readonly ordersService: OrdersService,
		private readonly statsService: StatsService,
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

		try {
			// 3. Получить список URLs из sitemap НА ЛЕТУ
			const allUrls = await this.crawlersService.getAllSitemapUrls(order.hostname);

			// 4. Ограничить до totalUrls из Order
			const urlsToProcess = allUrls.slice(0, order.totalUrls || allUrls.length);
			const totalUrls = urlsToProcess.length;

			this.logger.log(`Processing order ${orderId}: ${totalUrls} URLs with batch size ${batchSize}`);

			// 5. Обработка страниц батчами
			const allPages: PageContent[] = [];

			for (const url of urlsToProcess) {
				try {
					await this.pageBatchProcessor.add(url);

					if (this.pageBatchProcessor.count >= batchSize) {
						// Сгенерировать саммари для батча
						const processedPages = await this.pageBatchProcessor.process(order.modelId, provider);
						allPages.push(...processedPages);

						// Обновить processedUrls в Order
						await this.ordersService.updateProgress(orderId, allPages.length);

						// Отправить прогресс через BullMQ события
						await job.updateProgress({});

						this.logger.debug(`Progress: ${allPages.length}/${totalUrls} URLs processed`);
					}
				} catch (error) {
					// Ошибка обработки отдельной страницы или недоступности ресурса - записываем и продолжаем
					if (error instanceof PageProcessingError || error instanceof ResourceUnavailableError) {
						await this.ordersService.addError(orderId, error.message);
						this.logger.warn(`Failed to process ${url}: ${error.message}`);
						continue;
					}
					// Критическая ошибка - прерываем весь job
					throw error;
				}
			}

			// Обработать оставшийся батч
			if (this.pageBatchProcessor.count > 0) {
				const processedPages = await this.pageBatchProcessor.process(order.modelId, provider);
				allPages.push(...processedPages);

				// Обновить processedUrls в Order
				await this.ordersService.updateProgress(orderId, allPages.length);

				// Отправить прогресс через BullMQ события
				await job.updateProgress({});

				this.logger.debug(`Progress: ${allPages.length}/${totalUrls} URLs processed (final batch)`);
			}

			// 6. Генерация Description сайта (с кэшем)
			this.logger.log(`Generating website description for order ${orderId}`);

			const { hostname } = this.cacheService.parseUrl(order.hostname);
			const hashKey = this.cacheService.buildHashKey(order.modelId, hostname);
			const description = await this.cacheService.get(hashKey, '__description__', async () => {
				this.logger.debug(`Generating description for ${order.hostname} (cache miss)`);
				return provider.generateDescription(allPages);
			});

			// 7. Форматирование llms.txt
			const output = LlmsTxtFormatter.format(order.hostname, description, allPages);

			// 8-9. Сохранение результата - атомарное обновление
			await this.orderRepository.update(orderId, {
				output,
				status: OrderStatus.COMPLETED,
				completedAt: new Date()
			});

			// Отправить финальное событие через BullMQ ПОСЛЕ сохранения в БД
			await job.updateProgress({});

			// WebSocket события о завершении и статистике будут отправлены
			// через QueueEventsService при получении BullMQ 'completed' события

			this.logger.log(`Order ${orderId} completed successfully with ${allPages.length} pages`);
		} catch (error) {
			// Сохранить ошибку в Order через OrdersService
			const errorMessage = error instanceof Error ? error.message : String(error);
			await this.ordersService.updateOrderStatus(orderId, OrderStatus.FAILED);
			await this.ordersService.addError(orderId, errorMessage);

			// WebSocket события об ошибке будут отправлены через QueueEventsService
			// при получении BullMQ 'failed' события

			this.logger.error(`Order ${orderId} failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
			throw error; // Пробросить для retry BullMQ
		}
	}
}

export { OrderJobHandler };
