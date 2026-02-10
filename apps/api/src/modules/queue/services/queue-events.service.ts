import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueueEvents } from 'bullmq';
import { AppConfigService } from '../../../config/config.service';
import { AiModelsConfigService } from '../../ai-models/services/ai-models-config.service';
import { WebSocketService } from '../../websocket/services/websocket.service';
import { OrdersService } from '../../orders/services/orders.service';
import { OrderResponseDto } from '../../orders/dto/order-response.dto';
import { Order } from '../../orders/entities/order.entity';

/**
 * Queue Events Service
 * Bridges BullMQ worker events to WebSocket communication
 * Listens to worker events (progress, completed, failed) via QueueEvents
 * and forwards them to WebSocket clients via WebSocketService
 */
@Injectable()
class QueueEventsService implements OnModuleInit, OnModuleDestroy {
	private readonly queueEvents = new Map<string, QueueEvents>();
	private readonly logger = new Logger(QueueEventsService.name);

	constructor(
		private readonly configService: AppConfigService,
		private readonly aiModelsConfigService: AiModelsConfigService,
		private readonly webSocketService: WebSocketService,
		private readonly ordersService: OrdersService,
		@InjectRepository(Order) private readonly orderRepository: Repository<Order>
	) { }

	onModuleInit() {
		this.logger.log('Initializing QueueEvents bridge for WebSocket communication...');

		// Get all unique queue names from AI models configuration
		const queueNames = this.aiModelsConfigService.getUniqueQueueNames();

		// Create QueueEvents listener for each queue
		for (const queueName of queueNames) {
			this.createQueueEventsListener(queueName);
		}

		this.logger.log(`QueueEvents bridge initialized for ${queueNames.length} queues: ${queueNames.join(', ')}`);
	}

	async onModuleDestroy() {
		this.logger.log('Shutting down QueueEvents bridge...');

		// Close all QueueEvents listeners
		const promises = Array.from(this.queueEvents.entries()).map(async ([queueName, queueEvents]) => {
			await queueEvents.close();
			this.logger.log(`QueueEvents closed: ${queueName}`);
		});

		await Promise.all(promises);
		this.queueEvents.clear();

		this.logger.log('QueueEvents bridge shutdown completed');
	}

	/**
	 * Create QueueEvents listener for a specific queue
	 */
	private createQueueEventsListener(queueName: string): void {
		const queueEvents = new QueueEvents(queueName, {
			connection: {
				host: this.configService.redis.host,
				port: this.configService.redis.port,
				maxRetriesPerRequest: null // Required for BullMQ
			}
		});

		// Listen to progress events
		queueEvents.on('progress', ({ jobId, data }) => {
			this.handleProgressEvent(jobId, data).catch((error) => {
				this.logger.error(`Error handling progress event for job ${jobId}:`, error);
			});
		});

		// Listen to completed events
		queueEvents.on('completed', ({ jobId }) => {
			this.handleCompletedEvent(jobId).catch((error) => {
				this.logger.error(`Error handling completed event for job ${jobId}:`, error);
			});
		});

		// Listen to failed events
		queueEvents.on('failed', ({ jobId, failedReason }) => {
			this.handleFailedEvent(jobId, failedReason).catch((error) => {
				this.logger.error(`Error handling failed event for job ${jobId}:`, error);
			});
		});

		// Handle QueueEvents errors
		queueEvents.on('error', (error) => {
			this.logger.error(`QueueEvents error for queue ${queueName}:`, error);
		});

		this.queueEvents.set(queueName, queueEvents);
		this.logger.log(`QueueEvents listener created for queue: ${queueName}`);
	}

	/**
	 * Handle progress event from worker
	 */
	private async handleProgressEvent(jobId: string, _data: unknown): Promise<void> {
		this.logger.debug(`Progress event for job ${jobId}`);

		const orderId = this.extractOrderIdFromJobId(jobId);
		if (!orderId) {
			this.logger.warn(`Could not extract orderId from jobId: ${jobId}`);
			return;
		}

		// Get complete order data and send via WebSocket
		try {
			const order = await this.ordersService.findById(orderId);
			const orderDto = OrderResponseDto.create(order);
			this.webSocketService.sendOrderUpdate(orderDto);

			this.logger.debug(`Order update sent for order ${orderId}`);
		} catch (error) {
			this.logger.error(`Failed to send order update for ${orderId}:`, error);
		}
	}

	/**
	 * Handle job completion event from worker
	 */
	private async handleCompletedEvent(jobId: string): Promise<void> {
		this.logger.log(`Completed event for job ${jobId}`);

		const orderId = this.extractOrderIdFromJobId(jobId);
		if (!orderId) {
			this.logger.warn(`Could not extract orderId from jobId: ${jobId}`);
			return;
		}

		// Get complete order data and send via WebSocket
		try {
			const order = await this.ordersService.getUserOrder(orderId);
			const orderDto = OrderResponseDto.create(order);
			this.webSocketService.sendOrderUpdate(orderDto);

			this.logger.log(`Order completion sent for order ${orderId} with status: ${order.status}`);
		} catch (error) {
			this.logger.error(`Failed to send order completion for ${orderId}:`, error);
		}
	}

	/**
	 * Handle job failure event from worker
	 */
	private async handleFailedEvent(jobId: string, failedReason: string): Promise<void> {
		this.logger.log(`Failed event for job ${jobId}: ${failedReason}`);

		const orderId = this.extractOrderIdFromJobId(jobId);
		if (!orderId) {
			this.logger.warn(`Could not extract orderId from jobId: ${jobId}`);
			return;
		}

		// Get complete order data and send via WebSocket
		try {
			const order = await this.ordersService.findById(orderId);
			const orderDto = OrderResponseDto.create(order);
			this.webSocketService.sendOrderUpdate(orderDto);

			this.logger.log(`Order failure notification sent for order ${orderId}`);
		} catch (error) {
			this.logger.error(`Failed to send order failure notification for ${orderId}:`, error);
		}
	}

	/**
	 * Extract orderId from BullMQ jobId
	 * Expected format: "order-{orderId}" based on the queue system
	 */
	private extractOrderIdFromJobId(jobId: string): number | null {
		// Handle both "order-{id}" format and plain number string formats
		const orderMatch = jobId.match(/^order-(\d+)$/);
		if (orderMatch) {
			return parseInt(orderMatch[1], 10);
		}

		// If it's just a number, try parsing it directly
		const directNumber = parseInt(jobId, 10);
		if (!isNaN(directNumber)) {
			return directNumber;
		}

		return null;
	}
}

export { QueueEventsService };
