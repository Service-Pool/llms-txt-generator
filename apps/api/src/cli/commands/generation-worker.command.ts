import { Command, CommandRunner } from 'nest-commander';
import { Logger } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { QueueService } from '../../queue/queue.service';
import { AppConfigService } from '../../config/config.service';
import { GenerationJobHandler } from '../../queue/handlers/generation-job.handler';
import { GenerationJobMessage } from '../../queue/messages/generation-job.message';

@Command({
	name: 'generation-worker:start',
	description: 'Start the generation worker to process jobs from the queue'
})
export class GenerationWorkerCommand extends CommandRunner {
	private readonly logger = new Logger(GenerationWorkerCommand.name);
	private readonly workers: Worker[] = [];
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
			const worker = this.queueService.createWorker<GenerationJobMessage>(queueName, this.processJob);

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
