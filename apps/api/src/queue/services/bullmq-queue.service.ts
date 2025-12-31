import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Queue, Worker, Job, JobsOptions, ConnectionOptions, QueueEvents } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppConfigService } from '../../config/config.service';
import { Generation } from '../../generations/entities/generation.entity';
import { GenerationStatus } from '../../shared/enums/generation-status.enum';
import { GenerationProgressEvent, GenerationStatusEvent } from '../../websocket/events';
import { JobIdUtil } from '../../shared/utils/job-id.util';

@Injectable()
export class BullMqQueueService implements OnModuleInit, OnModuleDestroy {
	private readonly queues = new Map<string, Queue>();
	private readonly queueEvents = new Map<string, QueueEvents>();
	private readonly logger = new Logger(BullMqQueueService.name);
	private readonly jobOptions: JobsOptions;
	private readonly redisConnection: ConnectionOptions;

	constructor(
		private readonly configService: AppConfigService,
		@InjectRepository(Generation) private readonly generationRepository: Repository<Generation>,
		private readonly eventEmitter: EventEmitter2
	) {
		this.jobOptions = {
			attempts: this.configService.queue.retryLimit + 1, // retryLimit + initial attempt
			backoff: {
				type: 'fixed' as const,
				delay: this.configService.queue.retryDelay * 1000 // seconds to ms
			},
			removeOnComplete: this.configService.queue.removeOnComplete,
			removeOnFail: this.configService.queue.removeOnFail
		};

		this.redisConnection = {
			...this.configService.redis,
			maxRetriesPerRequest: null // Required for BullMQ
		};
	}

	/**
	 * Получить Queue instance
	 */
	public getQueue(queueName: string): Queue | undefined {
		return this.queues.get(queueName);
	}

	public onModuleInit() {
		this.logger.log('BullMQ module initializing...');

		// Создать Queue и QueueEvents для каждого провайдера
		for (const providerConfig of Object.values(this.configService.providers)) {
			this.logger.log(`Processing provider config: ${providerConfig.queueName} (enabled: ${providerConfig.enabled})`);

			if (!providerConfig.enabled) {
				continue;
			}

			const queue = new Queue(providerConfig.queueName, {
				connection: this.redisConnection,
				streams: {
					events: {
						maxLen: 1000 // Хранить только последние 1000 событий
					}
				}
			});

			// QueueEvents для прослушивания событий worker'а через Redis
			const queueEvents = new QueueEvents(providerConfig.queueName, {
				connection: this.redisConnection
			});

			this.queues.set(providerConfig.queueName, queue);
			this.logger.log(`Queue created: ${providerConfig.queueName}`);

			queue.on('error', (error) => {
				this.logger.error(`Queue ${providerConfig.queueName} error:`, error);
			});

			queueEvents.on('progress', ({ jobId, data }) => {
				this.logger.log(`Progress event for job ${jobId}`);
				const progressData = data as { processedUrls: number; totalUrls: number };
				const generationId = JobIdUtil.parse(jobId);

				if (generationId) {
					this.eventEmitter.emit('generation.progress', new GenerationProgressEvent(
						generationId,
						GenerationStatus.ACTIVE,
						progressData.processedUrls,
						progressData.totalUrls
					));
				}
			});

			queueEvents.on('completed', ({ jobId }) => {
				(async () => {
					this.logger.log(`Completed event for job ${jobId}`);
					const generationId = JobIdUtil.parse(jobId);

					if (generationId) {
						const generation = await this.generationRepository.findOne({ where: { id: generationId } });

						if (generation) {
							this.logger.log(`Emitting generation.status event for ${generationId}`);
							this.eventEmitter.emit('generation.status', new GenerationStatusEvent(
								generationId,
								GenerationStatus.COMPLETED,
								generation.content || undefined,
								undefined,
								generation.entriesCount || undefined
							));
						}
					}
				})().catch((err: Error) => {
					this.logger.error(`Error handling job completion: ${err.message}`);
				});
			});

			queueEvents.on('failed', ({ jobId, failedReason }) => {
				this.logger.log(`Failed event for job ${jobId}`);
				const generationId = JobIdUtil.parse(jobId);

				if (generationId) {
					this.eventEmitter.emit('generation.status', new GenerationStatusEvent(
						generationId,
						GenerationStatus.FAILED,
						undefined,
						failedReason
					));
				}
			});

			this.queueEvents.set(providerConfig.queueName, queueEvents);
			this.logger.log(`QueueEvents created: ${providerConfig.queueName}`);
		}

		this.logger.log('BullMQ queues initialized');
	}

	public async onModuleDestroy() {
		// Закрыть все QueueEvents
		for (const [queueName, queueEvents] of this.queueEvents.entries()) {
			await queueEvents.close();
			this.logger.log(`QueueEvents closed: ${queueName}`);
		}

		// Закрыть все очереди
		for (const [queueName, queue] of this.queues.entries()) {
			await queue.close();
			this.logger.log(`Queue closed: ${queueName}`);
		}

		this.logger.log('BullMQ queues stopped');
	}

	public async send(queueName: string, data: unknown, jobId: string): Promise<void> {
		const queue = this.queues.get(queueName);

		if (!queue) {
			throw new Error(`Queue not found: ${queueName}`);
		}

		const options = { ...this.jobOptions, jobId };

		const job = await queue.add('generate', data, options);
		this.logger.log(`Job added to ${queueName} with ID ${job.id}`);
	}

	public async remove(jobId: string): Promise<void> {
		// Try to remove from all queues (job can be in any provider queue)
		for (const [queueName, queue] of this.queues.entries()) {
			const job = await queue.getJob(jobId);
			if (job) {
				await job.remove();
				this.logger.log(`Job ${jobId} removed from ${queueName}`);
				return;
			}
		}
		this.logger.warn(`Job ${jobId} not found in any queue`);
	}

	/**
	 * Создать Worker для обработки jobs
	 */
	public createWorker<T = unknown>(queueName: string, processor: (job: Job<T>) => Promise<void>): Worker<T> {
		const worker = new Worker<T>(
			queueName,
			async (job) => {
				await processor(job);
			},
			{
				connection: this.redisConnection,
				lockDuration: 30000,
				stalledInterval: 30000
			}
		);

		// Worker-local events (logging only, WebSocket events handled by QueueEvents in main app)
		worker.on('active', (job) => {
			this.logger.log(`========================================================`);
			this.logger.log(`Job ${job.id} started processing`);
			this.updateGenerationStatus(job, GenerationStatus.ACTIVE);
		});

		worker.on('completed', (job) => {
			this.logger.log(`Job ${job.id} completed`);
			this.logger.log(`========================================================`);
			this.updateGenerationStatus(job, GenerationStatus.COMPLETED);
		});

		worker.on('failed', (job, err) => {
			this.logger.error(`Job ${job?.id} failed:`, err);
			this.logger.log(`========================================================`);
			this.updateGenerationStatus(job, GenerationStatus.FAILED, err.message || String(err));
		});

		worker.on('error', (error) => {
			this.logger.error(`Worker error for ${queueName}:`, error);
			this.logger.log(`========================================================`);
		});

		this.logger.log(`Worker created for ${queueName}`);

		return worker;
	}

	/**
	 * Обновить статус generation в БД
	 */
	private updateGenerationStatus(job: Job<unknown> | undefined, status: GenerationStatus, errorMessage?: string): void {
		const generationId = this.extractGenerationId(job);

		if (!generationId) {
			return;
		}

		const updateData: Partial<Generation> = { status };
		if (errorMessage !== undefined) {
			updateData.errorMessage = errorMessage;
		}

		this.generationRepository.update(generationId, updateData)
			.then(() => {
				this.logger.log(`Generation ${generationId} status updated to ${status}`);
			})
			.catch((error: unknown) => {
				this.logger.error(`Failed to update generation ${generationId} status:`, error);
			});
	}

	/**
	 * Извлечь generationId из job data
	 */
	private extractGenerationId(job: Job<unknown> | undefined): number | null {
		const data = job?.data as { generationId?: number } | undefined;
		return data?.generationId || null;
	}
}
