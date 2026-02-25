import { Command, CommandRunner } from 'nest-commander';
import { Logger } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { QueueManagerService } from '@/modules/queue/services/queue-manager.service';
import { AiModelsConfigService } from '@/modules/ai-models/services/ai-models-config.service';
import { OrderJobHandler } from '@/modules/queue/handlers/order-job.handler';

/**
 * CLI команда для запуска worker'а обработки заказов
 * Запускается отдельно от основного приложения для масштабирования
 *
 * Usage:
 *   npm run order-worker
 *   или
 *   node dist/bootstrap/cli.js order-worker:start
 */
@Command({
	name: 'order-worker:start',
	description: 'Start the generation worker to process jobs from the queue'
})
class OrderWorkerCommand extends CommandRunner {
	private readonly logger = new Logger(OrderWorkerCommand.name);
	private readonly workers: Worker<{ orderId: number }>[] = [];
	private isShuttingDown = false;

	constructor(
		private readonly queueManagerService: QueueManagerService,
		private readonly aiModelsConfigService: AiModelsConfigService,
		private readonly orderJobHandler: OrderJobHandler
	) {
		super();
	}

	public async run(): Promise<void> {
		this.logger.log('Starting generation worker...');

		// Получить все уникальные очереди из конфигурации моделей
		const queueNames = this.aiModelsConfigService.getUniqueQueueNames();

		// Создать worker для каждой очереди
		for (const queueName of queueNames) {
			const worker = this.queueManagerService.createWorker(queueName, this.processJob);
			this.workers.push(worker);
			this.logger.log(`Worker started for ${queueName} queue`);
		}

		this.setupGracefulShutdown();

		this.logger.log(`Worker started successfully for ${queueNames.length} queue(s)`);

		// Keep process alive
		await new Promise(() => { });
	}

	/**
	 * Обработка job из очереди
	 */
	private processJob = async (job: Job<{ orderId: number }>): Promise<void> => {
		this.logger.log(`Processing job ${job.id} for order ${job.data.orderId}`);
		await this.orderJobHandler.handle(job);
	};

	/**
	 * Настройка graceful shutdown для SIGTERM и SIGINT
	 */
	private setupGracefulShutdown(): void {
		process.on('SIGTERM', () => {
			this.gracefulShutdown('SIGTERM');
		});
		process.on('SIGINT', () => {
			this.gracefulShutdown('SIGINT');
		});
	}

	/**
	 * Graceful shutdown - корректное завершение всех workers
	 */
	private gracefulShutdown(signal: string): void {
		if (this.isShuttingDown) {
			return;
		}

		this.isShuttingDown = true;
		this.logger.log(`Received ${signal}, starting graceful shutdown...`);

		// Таймаут 10 секунд для graceful shutdown
		const timeout = setTimeout(() => {
			this.logger.warn('Graceful shutdown timeout (10s)! Force exit...');
			process.exit(0);
		}, 10000);

		// Закрыть все workers
		this.logger.log('Closing workers...');
		Promise.all(this.workers.map(w => w.close()))
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

export { OrderWorkerCommand };
