import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Job } from 'bullmq';
import { Order } from '../../orders/entities/order.entity';
import { OrderStatus } from '../../../enums/order-status.enum';
import { AiModelsConfigService } from '../../ai-models/services/ai-models-config.service';
import { CrawlersService } from '../../crawlers/services/crawlers.service';
import { ContentExtractionService } from '../../content/services/content-extraction.service';
import { CacheService } from '../../generations/services/cache.service';
import { LLMProviderFactory } from '../../generations/services/llm-provider-factory.service';
import { BaseLLMProviderService, PageSummary } from '../../generations/services/base-llm-provider.service';
import { LlmsTxtFormatter } from '../../generations/utils/llms-txt-formatter';
import { OrdersService } from '../../orders/services/orders.service';

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
		private readonly contentExtractionService: ContentExtractionService,
		private readonly cacheService: CacheService,
		private readonly llmProviderFactory: LLMProviderFactory,
		private readonly ordersService: OrdersService,
		@InjectRepository(Order) private readonly orderRepository: Repository<Order>,
		private readonly dataSource: DataSource
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

		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			// 3. Получить список URLs из sitemap НА ЛЕТУ
			const allUrls = await this.crawlersService.getAllSitemapUrls(order.hostname);

			// 4. Ограничить до totalUrls из Order
			const urlsToProcess = allUrls.slice(0, order.totalUrls || allUrls.length);
			const totalUrls = urlsToProcess.length;

			this.logger.log(`Processing order ${orderId}: ${totalUrls} URLs with batch size ${batchSize}`);

			// 5. Обработка страниц батчами
			const summaries: PageSummary[] = [];
			let batch: string[] = [];

			for (const url of urlsToProcess) {
				batch.push(url);

				if (batch.length >= batchSize) {
					await this.processBatch(batch, order.modelId, provider, summaries);

					// Обновить прогресс через BullMQ job
					await job.updateProgress({
						processedUrls: summaries.length,
						totalUrls
					});

					// Обновить processedUrls в Order
					await this.orderRepository.update(orderId, {
						processedUrls: summaries.length
					});

					this.logger.debug(`Progress: ${summaries.length}/${totalUrls} URLs processed`);

					batch = [];
				}
			}

			// Обработать оставшийся батч
			if (batch.length > 0) {
				await this.processBatch(batch, order.modelId, provider, summaries);
				await job.updateProgress({ processedUrls: summaries.length, totalUrls });

				// Обновить processedUrls в Order
				await this.ordersService.updateProgress(orderId, summaries.length);

				this.logger.debug(`Progress: ${summaries.length}/${totalUrls} URLs processed (final batch)`);
			}

			// 6. Генерация Description сайта (с кэшем)
			this.logger.log(`Generating website description for order ${orderId}`);
			const { hostname } = this.cacheService.parseUrl(order.hostname);
			const hashKey = this.cacheService.buildHashKey(order.modelId, hostname);
			const description = await this.cacheService.getWithCache(hashKey, '__description__', async () => {
				this.logger.debug(`Generating description for ${order.hostname} (cache miss)`);
				return provider.generateDescription(summaries);
			});

			// 7. Форматирование llms.txt
			const output = LlmsTxtFormatter.format(order.hostname, description, summaries);

			// 8-9. Сохранение результата
			await queryRunner.manager.update(Order, orderId, {
				output,
				status: OrderStatus.COMPLETED,
				completedAt: new Date()
			});

			await queryRunner.commitTransaction();

			this.logger.log(`Order ${orderId} completed successfully with ${summaries.length} pages`);
		} catch (error) {
			await queryRunner.rollbackTransaction();

			// Сохранить ошибку в Order через OrdersService
			const errorMessage = error instanceof Error ? error.message : String(error);
			await this.ordersService.updateOrderStatus(orderId, OrderStatus.FAILED);
			await this.ordersService.addError(orderId, errorMessage);

			this.logger.error(`Order ${orderId} failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
			throw error; // Пробросить для retry BullMQ
		} finally {
			await queryRunner.release();
		}
	}

	/**
	 * Обработка батча страниц
	 * @param batch Массив URLs для обработки
	 * @param modelId ID модели для кэша
	 * @param provider LLM провайдер
	 * @param summaries Массив для накопления результатов
	 */
	private async processBatch(batch: string[], modelId: string, provider: BaseLLMProviderService, summaries: PageSummary[]): Promise<void> {
		for (const url of batch) {
			try {
				// Извлечь title и content
				const { title, content } = await this.contentExtractionService.extractContent(url);

				// Получить hostname и path для кэша
				const { hostname, path } = this.cacheService.parseUrl(url);
				const hashKey = this.cacheService.buildHashKey(modelId, hostname);

				// Использовать getWithCache - автоматически проверит кэш и сгенерирует при MISS
				const summary = await this.cacheService.getWithCache(hashKey, path, async () => {
					this.logger.debug(`Generating summary for ${url} (cache miss)`);
					return provider.generateSummary(content, title);
				});

				summaries.push({ url, title, summary });
			} catch (error) {
				this.logger.error(`Failed to process URL ${url}:`, error);
				// Re-throw to fail the entire job (PRD 9.3 — 100% успех или FAILED)
				throw new Error(`Failed to process URL ${url}: ${error instanceof Error ? error.message : String(error)}`);
			}
		}
	}
}

export { OrderJobHandler };
