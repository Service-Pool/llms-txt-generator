import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Queue, Worker, Job, JobsOptions, ConnectionOptions, JobState } from 'bullmq';
import { AppConfigService } from '@/config/config.service';
import { AiModelsConfigService } from '@/modules/ai-models/services/ai-models-config.service';
import { QueueConfigRepository } from '../repositories/queue-config.repository';

/**
 * Queue Service для обработки Orders
 * Динамически создает очереди на основе конфигурации моделей (AiModelsConfigService)
 */
@Injectable()
class QueueManagerService implements OnModuleInit, OnModuleDestroy {
	private readonly queues = new Map<string, Queue>();
	private readonly logger = new Logger(QueueManagerService.name);
	private readonly jobOptions: JobsOptions;
	private readonly redisConnection: ConnectionOptions;

	constructor(
		private readonly configService: AppConfigService,
		private readonly aiModelsConfigService: AiModelsConfigService,
		private readonly queueConfigRepository: QueueConfigRepository
	) {
		// Настройки повторов из конфига
		this.jobOptions = {
			attempts: this.configService.jobConfig.attempts,
			backoff: {
				type: this.configService.jobConfig.backoff.type,
				delay: this.configService.jobConfig.backoff.delay
			},
			removeOnComplete: this.configService.jobConfig.removeOnComplete,
			removeOnFail: this.configService.jobConfig.removeOnFail
		};

		this.redisConnection = {
			host: this.configService.redis.host,
			port: this.configService.redis.port,
			maxRetriesPerRequest: this.configService.redis.maxRetriesPerRequest.bullmq as number | null
		};
	}

	/**
	 * Инициализация очередей при старте приложения
	 * Динамически создает Queue для каждого уникального queueName из конфигурации моделей
	 */
	onModuleInit() {
		this.logger.log('Initializing Queue Service...');

		// Получить все уникальные имена очередей из конфигурации моделей
		const queueNames = this.aiModelsConfigService.getUniqueQueueNames();

		for (const queueName of queueNames) {
			// Создать Queue для каждого уникального queueName
			const queue = new Queue(queueName, {
				connection: this.redisConnection,
				streams: {
					events: {
						maxLen: this.configService.jobConfig.streams.maxLen
					}
				}
			});

			this.queues.set(queueName, queue);
			this.logger.log(`Queue created: ${queueName}`);

			// Error handling
			queue.on('error', (error) => {
				this.logger.error(`Queue ${queueName} error:`, error);
			});
		}

		this.logger.log(`Queue Service initialized with ${queueNames.length} queue(s)`);
	}

	/**
	 * Graceful shutdown - закрытие всех очередей
	 */
	async onModuleDestroy() {
		this.logger.log('Shutting down Queue Service...');

		// Закрыть все очереди
		for (const [queueName, queue] of this.queues.entries()) {
			await queue.close();
			this.logger.log(`Queue closed: ${queueName}`);
		}

		this.logger.log('Queue Service stopped');
	}

	/**
	 * Добавить Order в очередь
	 *
	 * @param orderId - ID заказа
	 * @param queueName - Имя очереди (из model.queueName)
	 * @returns jobId для отслеживания
	 */
	public async addOrderToQueue(orderId: number, queueName: string): Promise<string> {
		const queue = this.queues.get(queueName);

		if (!queue) {
			throw new Error(`Queue not found: ${queueName}`);
		}

		// Создаем jobId используя приватный метод для единообразия
		const jobId = this.createJobId(orderId);

		const job = await queue.add(
			'generation', // job name
			{ orderId }, // job data
			{ ...this.jobOptions, jobId }
		);

		this.logger.log(`Order ${orderId} added to queue ${queueName} with jobId ${job.id}`);
		return job.id;
	}

	/**
	 * Получить позицию job в очереди (PRD 9.2)
	 *
	 * @param queueName - Имя очереди
	 * @param jobId - ID job
	 * @returns Позиция в очереди (null если job не в waiting state)
	 */
	public async getQueuePosition(queueName: string, jobId: string): Promise<number | null> {
		const queue = this.queues.get(queueName);

		if (!queue) {
			this.logger.warn(`Queue not found: ${queueName}`);
			return null;
		}

		try {
			const job = await queue.getJob(jobId);

			if (!job) {
				this.logger.warn(`Job ${jobId} not found in queue ${queueName}`);
				return null;
			}

			// Получить позицию только для waiting jobs
			const state = await job.getState();
			if (state !== 'waiting') {
				// Job уже обрабатывается или завершен
				return null;
			}

			// Получить все waiting jobs
			const waitingJobs = await queue.getWaiting();
			const position = waitingJobs.findIndex(j => j.id === jobId);

			return position >= 0 ? position + 1 : null; // 1-indexed
		} catch (error) {
			this.logger.error(`Error getting queue position for job ${jobId}:`, error);
			return null;
		}
	}

	/**
	 * Удалить job из конкретной очереди
	 * Используется для очистки джобов в указанных статусах
	 *
	 * @param queueName - Имя очереди
	 * @param jobId - ID job для удаления
	 * @param statuses - Статусы джобов для удаления. Если пустой массив, удаляет в любом статусе
	 */
	public async removeJob(queueName: string, jobId: string, statuses: JobState[]): Promise<void> {
		const queue = this.queues.get(queueName);

		if (!queue) {
			this.logger.warn(`Queue not found: ${queueName}`);
			return;
		}

		try {
			const job = await queue.getJob(jobId);

			if (!job) {
				// Job не существует - всё в порядке
				return;
			}

			const state = await job.getState();

			// Если массив статусов пустой, удаляем в любом статусе
			// Иначе удаляем только в указанных статусах
			// Джобы в состоянии 'unknown' не удаляем для безопасности
			if (state === 'unknown') {
				this.logger.warn(`Job ${jobId} is in unknown state, not removing`);
			} else if (statuses.length === 0 || statuses.includes(state)) {
				await job.remove();
				this.logger.log(`Job ${jobId} (${state}) removed from queue ${queueName}`);
			} else {
				this.logger.warn(`Job ${jobId} is in state '${state}', not removing (allowed: [${statuses.join(', ')}])`);
			}
		} catch (error) {
			this.logger.error(`Error removing job ${jobId} from queue ${queueName}:`, error);
		}
	}

	/**
	 * Создать Worker для обработки jobs
	 * Используется в CLI команде generation-worker:start
	 *
	 * @param queueName - Имя очереди для обработки
	 * @param handler - Функция-обработчик job
	 * @returns Worker instance
	 */
	public createWorker(
		queueName: string,
		handler: (job: Job<{ orderId: number }>) => Promise<void>
	): Worker<{ orderId: number }> {
		// Получить конфигурацию worker'а для этой очереди
		const queueConfig = this.queueConfigRepository.findByName(queueName);

		if (!queueConfig) {
			throw new Error(`Queue config not found for queue: ${queueName}`);
		}

		const worker = new Worker<{ orderId: number }>(
			queueName,
			async (job) => {
				await handler(job);
			},
			{
				connection: this.redisConnection,
				lockDuration: queueConfig.lockDuration,
				stalledInterval: queueConfig.stalledInterval,
				concurrency: queueConfig.concurrency
			}
		);

		// Логирование событий worker'а
		worker.on('active', (job: Job<{ orderId: number }>) => {
			this.logger.log(`Worker started processing job ${job.id} for order ${job.data.orderId}`);
		});

		worker.on('completed', (job: Job<{ orderId: number }>) => {
			this.logger.log(`Worker completed job ${job.id} for order ${job.data.orderId}`);
		});

		worker.on('failed', (job: Job<{ orderId: number }> | undefined, err: Error) => {
			if (job) {
				this.logger.error(`Worker failed job ${job.id} for order ${job.data.orderId}:`, err.message);
			} else {
				this.logger.error(`Worker failed with unknown job:`, err.message);
			}
		});

		worker.on('error', (error) => {
			this.logger.error(`Worker error for queue ${queueName}:`, error);
		});

		this.logger.log(`Worker created for queue ${queueName} (concurrency: ${queueConfig.concurrency})`);

		return worker;
	}

	/**
	 * Создать jobId из orderId (приватный - используется только внутри сервиса)
	 * @param orderId - ID заказа
	 * @returns jobId для BullMQ
	 */
	private createJobId(orderId: number): string {
		return `order-${orderId}`;
	}

	/**
	 * Извлечь orderId из BullMQ jobId (публичный - используется внешними сервисами)
	 * @param jobId - ID джоба из BullMQ
	 * @returns orderId или null если не удалось извлечь
	 */
	public extractOrderId(jobId: string): number | null {
		// Обрабатываем формат "order-{id}"
		const orderMatch = jobId.match(/^order-(\d+)$/);
		if (orderMatch) {
			return parseInt(orderMatch[1], 10);
		}

		// Если это просто число, пытаемся парсить напрямую (для совместимости)
		const directNumber = parseInt(jobId, 10);
		if (!isNaN(directNumber)) {
			return directNumber;
		}

		return null;
	}

	/**
	 * Получить Queue instance (для продвинутого использования)
	 */
	public getQueue(queueName: string): Queue | undefined {
		return this.queues.get(queueName);
	}
}

export { QueueManagerService };
