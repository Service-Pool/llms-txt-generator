import { AppConfigService } from '../../../config/config.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Generation } from '../../generations/entities/generation.entity';
import { GenerationRequest } from '../../generations/entities/generation-request.entity';
import { GenerationRequestUpdateEvent } from '../../websocket/websocket.events';
import { GenerationRequestDtoResponse } from '../../generations/dto/generation-response.dto';
import { GenerationStatus } from '../../../enums/generation-status.enum';
import { GenerationJobMessage } from '../messages/generation-job.message';
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JobUtils } from '../../../utils/job.utils';
import { Queue, Worker, Job, JobsOptions, ConnectionOptions, QueueEvents } from 'bullmq';
import { Repository } from 'typeorm';

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
		@InjectRepository(GenerationRequest) private readonly generationRequestRepository: Repository<GenerationRequest>,
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
				this.handleProgressEvent(jobId, data).catch((err: Error) => {
					this.logger.error(`Error handling progress event: ${err.message}`);
				});
			});

			queueEvents.on('completed', ({ jobId }) => {
				this.handleCompletedEvent(jobId).catch((err: Error) => {
					this.logger.error(`Error handling completed event: ${err.message}`);
				});
			});

			queueEvents.on('failed', ({ jobId, failedReason }) => {
				this.handleFailedEvent(jobId, failedReason).catch((err: Error) => {
					this.logger.error(`Error handling failed event: ${err.message}`);
				});
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
	public createWorker(queueName: string, processor: (job: Job<GenerationJobMessage>) => Promise<void>): Worker<GenerationJobMessage> {
		const worker = new Worker<GenerationJobMessage>(
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
		worker.on('active', (job: Job<GenerationJobMessage>) => {
			this.logger.log(`========================================================`);
			this.logger.log(`Job ${job.id} started processing`);
			this.updateGenerationStatus(job, GenerationStatus.ACTIVE);
		});

		worker.on('completed', (job: Job<GenerationJobMessage>) => {
			this.logger.log(`Job ${job.id} completed`);
			this.logger.log(`========================================================`);
			this.updateGenerationStatus(job, GenerationStatus.COMPLETED);
		});

		worker.on('failed', (job: Job<GenerationJobMessage>, err: Error) => {
			this.logger.error(`Job ${job?.id} failed:`, err);
			this.logger.log(`========================================================`);
			this.updateGenerationStatus(job, GenerationStatus.FAILED, err.message);
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
	private updateGenerationStatus(job: Job<GenerationJobMessage>, status: GenerationStatus, errorMessage?: string): void {
		const generationId = this.extractGenerationId(job);

		if (!generationId) {
			return;
		}

		const updateData: Partial<Generation> = { status };
		if (errorMessage !== undefined) {
			updateData.errors = errorMessage;
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
	private extractGenerationId(job: Job<GenerationJobMessage>): number {
		return job.data.generationId;
	}

	private async handleProgressEvent(jobId: string, data: unknown): Promise<void> {
		this.logger.log(`Progress event for job ${jobId}`);
		const progressData = data as { processedUrls: number; totalUrls: number };
		const generationId = JobUtils.parseId(jobId);

		if (generationId) {
			const generationRequest = await this.generationRequestRepository.findOne({
				where: { generation: { id: generationId } },
				relations: ['generation', 'generation.calculation']
			});

			if (generationRequest) {
				const dto = GenerationRequestDtoResponse.fromEntity(generationRequest);
				this.eventEmitter.emit('generation.request.update', new GenerationRequestUpdateEvent(
					dto,
					progressData.processedUrls
				));
			}
		}
	}

	private async handleCompletedEvent(jobId: string): Promise<void> {
		this.logger.log(`Completed event for job ${jobId}`);
		const generationId = JobUtils.parseId(jobId);

		if (generationId) {
			const generationRequest = await this.generationRequestRepository.findOne({
				where: { generation: { id: generationId } },
				relations: ['generation', 'generation.calculation']
			});

			if (generationRequest) {
				const dto = GenerationRequestDtoResponse.fromEntity(generationRequest);
				this.eventEmitter.emit('generation.request.update', new GenerationRequestUpdateEvent(dto));
			}
		}
	}

	private async handleFailedEvent(jobId: string, failedReason: string): Promise<void> {
		this.logger.log(`Failed event for job ${jobId}: ${failedReason}`);
		const generationId = JobUtils.parseId(jobId);

		if (generationId) {
			const generationRequest = await this.generationRequestRepository.findOne({
				where: { generation: { id: generationId } },
				relations: ['generation', 'generation.calculation']
			});

			if (generationRequest) {
				const dto = GenerationRequestDtoResponse.fromEntity(generationRequest);
				this.eventEmitter.emit('generation.request.update', new GenerationRequestUpdateEvent(dto));
			}
		}
	}
}
