import { AppConfigService } from '../../config/config.service';
import { Command, CommandRunner } from 'nest-commander';
import { GenerationJobHandler } from '../../modules/queue/handlers/generation-job.handler';
import { GenerationJobMessage } from '../../modules/queue/messages/generation-job.message';
import { Logger } from '@nestjs/common';
import { QueueService } from '../../modules/queue/queue.service';
import { Worker, Job } from 'bullmq';

@Command({
	name: 'generation-worker:start',
	description: 'Start the generation worker to process jobs from the queue'
})
export class GenerationWorkerCommand extends CommandRunner {
	private readonly logger = new Logger(GenerationWorkerCommand.name);
	private readonly workers: Worker<GenerationJobMessage>[] = [];
	private isShuttingDown = false;

	public constructor(private readonly queueService: QueueService, private readonly configService: AppConfigService, private readonly generationJobHandler: GenerationJobHandler) {
		super();
	}

	public async run(): Promise<void> {
		this.logger.log('Starting generation worker...');

		// Получить все уникальные очереди из конфигурации провайдеров
		const queues = [
			...new Set(Object.values(this.configService.providers).map(config => config.queueName))
		];

		// Создать worker для каждой очереди
		for (const queueName of queues) {
			const worker = this.queueService.createWorker(queueName, this.processJob);

			this.workers.push(worker);
			this.logger.log(`Worker started for ${queueName} queue`);
		}

		this.logger.log('Worker started successfully');

		// Setup graceful shutdown
		this.setupGracefulShutdown();

		// Keep process alive
		await new Promise(() => {});
	}

	private processJob = async (job: Job<GenerationJobMessage>): Promise<void> => {
		await this.generationJobHandler.handle(job);
	};

	private setupGracefulShutdown(): void {
		process.on('SIGTERM', this.handleSIGTERM);
		process.on('SIGINT', this.handleSIGINT);
	}

	private handleSIGTERM = (): void => {
		this.gracefulShutdown('SIGTERM');
	};

	private handleSIGINT = (): void => {
		this.gracefulShutdown('SIGINT');
	};

	private gracefulShutdown(signal: string): void {
		if (this.isShuttingDown) {
			return;
		}

		this.isShuttingDown = true;
		this.logger.log(`Received ${signal}, starting graceful shutdown...`);

		// Таймаут 10 секунд
		const timeout = setTimeout(() => {
			this.logger.warn('Graceful shutdown timeout (10s)! Force exit...');
			process.exit(0);
		}, 10000);

		// Закрыть все workers gracefully
		this.logger.log('Closing workers...');
		Promise.all(this.workers.map(worker => worker.close()))
			.then(() => {
				this.logger.log('All workers closed gracefully');
				clearTimeout(timeout);
				process.exit(0);
			})
			.catch((error) => {
				this.logger.error('Error during graceful shutdown:', error);
				clearTimeout(timeout);
				process.exit(1);
			});
	}
}
