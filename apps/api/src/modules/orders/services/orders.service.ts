import {
	Injectable,
	NotFoundException,
	ForbiddenException,
	BadRequestException,
	UnauthorizedException
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { CrawlersService } from '../../crawlers/services/crawlers.service';
import { QueueService } from '../../queue/services/queue.service';
import { AiModelsConfigService } from '../../ai-models/services/ai-models-config.service';
import { Currency } from '../../../enums/currency.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '../../../enums/order-status.enum';
import { OrderStatusMachine } from '../utils/order-status-machine';
import { Repository, DataSource } from 'typeorm';

@Injectable()
class OrdersService {
	constructor(
		@InjectRepository(Order)
		private readonly orderRepository: Repository<Order>,
		private readonly crawlersService: CrawlersService,
		private readonly cls: ClsService,
		private readonly queueService: QueueService,
		private readonly aiModelsConfigService: AiModelsConfigService,
		private readonly dataSource: DataSource
	) { }

	/**
	 * Create new order - SIMPLIFIED (no snapshot creation)
	 * Content extraction happens on-the-fly in worker
	 */
	public async createOrder(hostname: string, sessionId: string, userId?: number): Promise<Order> {
		const urls = await this.crawlersService.getAllSitemapUrls(hostname);

		if (!urls.length) {
			throw new BadRequestException('Sitemap did not return any URLs');
		}

		const order = this.orderRepository.create({
			hostname,
			sessionId,
			userId,
			totalUrls: urls.length,
			status: OrderStatus.CREATED
		});

		return this.orderRepository.save(order);
	}

	/**
	 * Get order by ID
	 * Validates ownership (sessionId or userId must match)
	 */
	public async getOrderById(id: number, sessionId: string, userId?: number): Promise<Order> {
		const order = await this.orderRepository.findOne({
			where: { id }
		});

		if (!order) {
			throw new NotFoundException(`Order with ID ${id} not found`);
		}

		// Validate ownership
		this.validateOwnership(order, sessionId, userId);

		return order;
	}

	/**
	 * Get all orders for user or session
	 */
	public async getUserOrders(sessionId: string, userId?: number): Promise<Order[]> {
		const where = userId
			? [{ userId }, { sessionId }]
			: [{ sessionId }];

		return this.orderRepository.find({
			where,
			order: { createdAt: 'DESC' }
		});
	}

	/**
	 * Start order with selected model
	 */
	public async startOrder(orderId: number, modelId: string, priceTotal: number, pricePerUrl: number, priceCurrency: Currency, totalUrls: number): Promise<Order> {
		const order = await this.orderRepository.findOne({
			where: { id: orderId }
		});

		if (!order) {
			throw new NotFoundException(`Order with ID ${orderId} not found`);
		}

		// Validate current status
		if (order.status !== OrderStatus.CREATED) {
			throw new BadRequestException(`Order must be in CREATED status to start. Current status: ${order.status}`);
		}

		// Validate authentication for paid models
		const userId = this.cls.get<number | null>('userId');
		if (priceTotal > 0 && !userId) {
			throw new UnauthorizedException('Authentication required for paid models');
		}

		// Determine next status based on price
		if (priceTotal === 0) {
			// Free model - go directly to queue (with transaction)
			OrderStatusMachine.validateTransition(order.status, OrderStatus.QUEUED);

			const queryRunner = this.dataSource.createQueryRunner();
			await queryRunner.connect();
			await queryRunner.startTransaction();

			try {
				// Update order with pricing and model INSIDE transaction
				order.modelId = modelId;
				order.priceTotal = priceTotal;
				order.pricePerUrl = pricePerUrl;
				order.priceCurrency = priceCurrency;
				order.totalUrls = totalUrls;
				order.status = OrderStatus.QUEUED;

				// Save order first within transaction
				const savedOrder = await queryRunner.manager.save(order);

				await queryRunner.commitTransaction();

				// Add to BullMQ queue AFTER commit to avoid race condition
				const modelConfig = this.aiModelsConfigService.getModelById(modelId);
				const jobId = await this.queueService.addOrderToQueue(savedOrder.id, modelConfig.queueName);

				// Update order with jobId (outside transaction)
				savedOrder.jobId = jobId;
				await this.orderRepository.save(savedOrder);

				return savedOrder;
			} catch (error) {
				await queryRunner.rollbackTransaction();
				throw error;
			} finally {
				await queryRunner.release();
			}
		} else {
			// Paid model - wait for payment
			OrderStatusMachine.validateTransition(order.status, OrderStatus.PENDING_PAYMENT);
			order.status = OrderStatus.PENDING_PAYMENT;
			return this.orderRepository.save(order);
		}
	}

	/**
	 * Update order status with validation
	 * Idempotent: can be called multiple times with same status without error
	 */
	public async updateOrderStatus(orderId: number, newStatus: OrderStatus): Promise<Order> {
		const order = await this.orderRepository.findOne({
			where: { id: orderId }
		});

		if (!order) {
			throw new NotFoundException(`Order with ID ${orderId} not found`);
		}

		// Validate status transition (now allows same status via state machine)
		OrderStatusMachine.validateTransition(order.status, newStatus);

		order.status = newStatus;

		// Set timestamps for specific statuses
		if (newStatus === OrderStatus.PROCESSING && !order.startedAt) {
			order.startedAt = new Date();
		}

		if ([OrderStatus.COMPLETED, OrderStatus.FAILED, OrderStatus.CANCELLED].includes(newStatus) && !order.completedAt) {
			order.completedAt = new Date();
		}

		// If status changed to PAID, automatically add to queue (with transaction)
		if (newStatus === OrderStatus.PAID) {
			const queryRunner = this.dataSource.createQueryRunner();
			await queryRunner.connect();
			await queryRunner.startTransaction();

			try {
				const savedOrder = await queryRunner.manager.save(order);

				// Transition to QUEUED
				OrderStatusMachine.validateTransition(savedOrder.status, OrderStatus.QUEUED);
				savedOrder.status = OrderStatus.QUEUED;

				if (!savedOrder.modelId) {
					throw new BadRequestException('Order has no modelId - cannot add to queue');
				}

				await queryRunner.manager.save(savedOrder);
				await queryRunner.commitTransaction();

				// Add to BullMQ queue AFTER commit to avoid race condition
				const modelConfig = this.aiModelsConfigService.getModelById(savedOrder.modelId);
				const jobId = await this.queueService.addOrderToQueue(savedOrder.id, modelConfig.queueName);

				// Update order with jobId (outside transaction)
				savedOrder.jobId = jobId;
				await this.orderRepository.save(savedOrder);

				return savedOrder;
			} catch (error) {
				await queryRunner.rollbackTransaction();
				throw error;
			} finally {
				await queryRunner.release();
			}
		}

		return this.orderRepository.save(order);
	}

	/**
	 * Update processing progress
	 */
	public async updateProgress(orderId: number, processedUrls: number): Promise<void> {
		await this.orderRepository.update(
			{ id: orderId },
			{ processedUrls }
		);
	}

	/**
	 * Update order output (llms.txt content)
	 */
	public async updateOutput(orderId: number, output: string): Promise<void> {
		await this.orderRepository.update(
			{ id: orderId },
			{ output }
		);
	}

	/**
	 * Add error to order
	 * Uses transaction with FOR UPDATE lock to prevent race conditions when modifying errors array
	 */
	public async addError(orderId: number, error: string): Promise<void> {
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			// Lock row for update to prevent race conditions
			const order = await queryRunner.manager.findOne(Order, {
				where: { id: orderId },
				lock: { mode: 'pessimistic_write' }
			});

			if (!order) {
				throw new NotFoundException(`Order with ID ${orderId} not found`);
			}

			const errors = order.errors ?? [];
			errors.push({
				message: error
			});

			await queryRunner.manager.update(Order, orderId, { errors });
			await queryRunner.commitTransaction();
		} catch (err) {
			await queryRunner.rollbackTransaction();
			throw err;
		} finally {
			await queryRunner.release();
		}
	}

	/**
	 * Update Stripe session ID
	 */
	public async updateStripeSession(orderId: number, stripeSessionId: string): Promise<void> {
		await this.orderRepository.update(
			{ id: orderId },
			{ stripeSessionId }
		);
	}

	/**
	 * Update Stripe Payment Intent secret
	 */
	public async updateStripePaymentIntent(orderId: number, stripePaymentIntentSecret: string): Promise<void> {
		await this.orderRepository.update(
			{ id: orderId },
			{ stripePaymentIntentSecret }
		);
	}

	/**
	 * Transfer orders from anonymous session to authenticated user
	 */
	public async transferSessionOrders(sessionId: string, userId: number): Promise<number> {
		const result = await this.orderRepository.update(
			{ sessionId, userId: null }, // anonymous orders from this session
			{ userId, sessionId: null } // bind to user, clear sessionId
		);

		return result.affected || 0;
	}

	/**
	 * Validate order ownership
	 */
	private validateOwnership(order: Order, sessionId: string, userId?: number): void {
		const isOwner = userId
			? order.userId === userId || order.sessionId === sessionId
			: order.sessionId === sessionId;

		if (!isOwner) {
			throw new ForbiddenException('You do not have access to this order');
		}
	}
}

export { OrdersService };
