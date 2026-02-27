import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Queue, Worker, Job, JobsOptions, ConnectionOptions } from 'bullmq';
import { AppConfigService } from '@/config/config.service';
import { AiModelsConfigService } from '@/modules/ai-models/services/ai-models-config.service';

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
		private readonly aiModelsConfigService: AiModelsConfigService
	) {
		// Настройки повторов из конфига
		this.jobOptions = {
			attempts: this.configService.queue.attempts,
			backoff: {
				type: this.configService.queue.backoff.type,
				delay: this.configService.queue.backoff.delay
			},
			removeOnComplete: this.configService.queue.removeOnComplete,
			removeOnFail: this.configService.queue.removeOnFail
		};

		this.redisConnection = {
			host: this.configService.redis.host,
			port: this.configService.redis.port,
			maxRetriesPerRequest: null // Required for BullMQ
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
						maxLen: 1000 // Хранить только последние 1000 событий
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

		// JobId формируется как "order-{orderId}" для уникальности и легкого поиска
		const jobId = `order-${orderId}`;

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
	 * Удалить job из очереди
	 *
	 * @param jobId - ID job для удаления
	 */
	public async removeJob(jobId: string): Promise<void> {
		// Попытаться найти и удалить из всех очередей
		for (const [queueName, queue] of this.queues.entries()) {
			const job = await queue.getJob(jobId);
			if (job) {
				await job.remove();
				this.logger.log(`Job ${jobId} removed from queue ${queueName}`);
				return;
			}
		}

		this.logger.warn(`Job ${jobId} not found in any queue`);
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
		const worker = new Worker<{ orderId: number }>(
			queueName,
			async (job) => {
				await handler(job);
			},
			{
				connection: this.redisConnection,
				lockDuration: 30000, // 30 секунд на обработку одного батча
				stalledInterval: 30000 // Проверка зависших jobs каждые 30 секунд
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

		this.logger.log(`Worker created for queue ${queueName}`);

		return worker;
	}

	/**
	 * Получить Queue instance (для продвинутого использования)
	 */
	public getQueue(queueName: string): Queue | undefined {
		return this.queues.get(queueName);
	}
}

export { QueueManagerService };
