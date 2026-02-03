import {
	Injectable,
	NotFoundException,
	ForbiddenException,
	BadRequestException,
	UnauthorizedException
} from '@nestjs/common';
import { CrawlersService } from '../../crawlers/services/crawlers.service';
import { QueueService } from '../../queue/services/queue.service';
import { AiModelsConfigService } from '../../ai-models/services/ai-models-config.service';
import { UsersService } from '../../users/services/users.service';
import { StripeService } from '../../payments/services/stripe.service';
import { AppConfigService } from '../../../config/config.service';
import { InjectRepository } from '@nestjs/typeorm';
import { ModelConfigDto } from '../../../modules/ai-models/dto/ai-model-config.dto';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '../../../enums/order-status.enum';
import { OrderStatusMachine } from '../utils/order-status-machine';
import { StripeSessionStatus } from '../../../enums/stripe-session-status.enum';
import { Repository, DataSource } from 'typeorm';

@Injectable()
class OrdersService {
	constructor(
		@InjectRepository(Order)
		private readonly orderRepository: Repository<Order>,
		private readonly crawlersService: CrawlersService,
		private readonly usersService: UsersService,
		private readonly queueService: QueueService,
		private readonly aiModelsConfigService: AiModelsConfigService,
		private readonly stripeService: StripeService,
		private readonly configService: AppConfigService,
		private readonly dataSource: DataSource
	) { }

	/**
	 * Calculate order price and save model configuration
	 * Can be called multiple times while order is in CREATED or CALCULATED status
	 */
	public async calculateOrder(orderId: number, modelId: string): Promise<Order> {
		const order = await this.getUserOrders(orderId);

		// Validate and transition to CALCULATED status
		OrderStatusMachine.validateTransition(order.status, OrderStatus.CALCULATED);

		const modelConfig = this.aiModelsConfigService.getModelById(modelId);
		const totalUrls = order.totalUrls;
		const pricePerUrl = modelConfig.baseRate;
		const priceCurrency = modelConfig.currency;
		const minPayment = this.configService.stripe.minPayment;

		let priceTotal = this.aiModelsConfigService.calculatePrice(modelId, totalUrls);

		// Apply Stripe minimum payment if price is below threshold
		if (priceTotal > 0 && priceTotal < minPayment) {
			priceTotal = minPayment;
		}

		order.modelId = modelConfig.id;
		order.priceTotal = priceTotal;
		order.pricePerUrl = pricePerUrl;
		order.priceCurrency = priceCurrency;
		order.totalUrls = totalUrls;
		order.status = OrderStatus.CALCULATED;

		return this.orderRepository.save(order);
	}

	/**
	 * Run order - queue for processing based on current status
	 * Uses saved modelId from calculate step
	 */
	public async runOrder(orderId: number): Promise<Order> {
		const session = this.usersService.getSessionData();
		const order = await this.getUserOrders(orderId);

		// Ensure modelId is saved (from calculate step or webhook)
		if (!order.modelId) {
			throw new BadRequestException('Order has no modelId. Please call /calculate first');
		}

		const modelConfig = this.aiModelsConfigService.getModelById(order.modelId);
		const priceTotal = order.priceTotal;

		// CALCULATED status
		if (order.status === OrderStatus.CALCULATED) {
			if (priceTotal === 0) {
				return this.queueOrder(order, modelConfig);
			} else {
				if (!session.userId) {
					throw new UnauthorizedException('Authentication required for paid models');
				}
				OrderStatusMachine.validateTransition(order.status, OrderStatus.PENDING_PAYMENT);
				order.status = OrderStatus.PENDING_PAYMENT;
				return this.orderRepository.save(order);
			}
		}

		// PENDING_PAYMENT
		if (order.status === OrderStatus.PENDING_PAYMENT) {
			if (!order.stripeSessionId && !order.stripePaymentIntentSecret) {
				throw new BadRequestException('Payment session not found. Please create payment session first');
			}

			let stripeStatus: StripeSessionStatus;

			// Check Checkout Session if available
			// Check Payment Intent if available
			if (order.stripeSessionId) {
				stripeStatus = await this.stripeService.checkSessionStatus(order.stripeSessionId);
			} else if (order.stripePaymentIntentSecret) {
				stripeStatus = await this.stripeService.checkPaymentIntentStatus(order.stripePaymentIntentSecret);
			}

			if (stripeStatus === StripeSessionStatus.COMPLETE) {
				await this.updateOrderStatus(order.id, OrderStatus.PAID);
				const paidOrder = await this.getUserOrders(orderId);
				return this.queueOrder(paidOrder, modelConfig);
			}

			if (stripeStatus === StripeSessionStatus.EXPIRED) {
				throw new BadRequestException('Payment session expired. Please create a new payment');
			}

			throw new BadRequestException('Payment not completed. Please complete payment first');
		}

		// PAID status - queue directly
		if (order.status === OrderStatus.PAID) {
			return this.queueOrder(order, modelConfig);
		}

		throw new BadRequestException(`Cannot run order in status: ${order.status}`);
	}

	/**
	 * Queue order for processing
	 * Saves pricing, transitions to QUEUED, and adds to processing queue
	 */
	private async queueOrder(order: Order, modelConfig: ModelConfigDto): Promise<Order> {
		OrderStatusMachine.validateTransition(order.status, OrderStatus.QUEUED);

		// Set pricing only if not already set (free orders) or model changed
		if (!order.modelId || order.modelId !== modelConfig.id) {
			const totalUrls = order.totalUrls;
			const pricePerUrl = modelConfig.baseRate;
			const priceTotal = this.aiModelsConfigService.calculatePrice(modelConfig.id, totalUrls);
			const priceCurrency = modelConfig.currency;

			order.modelId = modelConfig.id;
			order.priceTotal = priceTotal;
			order.pricePerUrl = pricePerUrl;
			order.priceCurrency = priceCurrency;
			order.totalUrls = totalUrls;
		}

		order.status = OrderStatus.QUEUED;

		await this.orderRepository.save(order);

		try {
			const jobId = await this.queueService.addOrderToQueue(order.id, modelConfig.queueName);
			await this.orderRepository.update(order.id, { jobId });
		} catch (error) {
			await this.orderRepository.update(order.id, {
				status: OrderStatus.FAILED,
				errors: [{ message: `Failed to add to queue: ${error instanceof Error ? error.message : String(error)}` }]
			});
			throw error;
		}

		const updatedOrder = await this.orderRepository.findOne({ where: { id: order.id } });
		if (!updatedOrder) {
			throw new Error(`Order ${order.id} not found after update`);
		}
		return updatedOrder;
	}

	/**
	 * Update order status with validation
	 * Just updates status and timestamps, no side effects
	 */
	public async updateOrderStatus(orderId: number, newStatus: OrderStatus): Promise<Order> {
		const order = await this.orderRepository.findOne({
			where: { id: orderId }
		});

		if (!order) {
			throw new NotFoundException(`Order with ID ${orderId} not found`);
		}

		// Validate status transition
		OrderStatusMachine.validateTransition(order.status, newStatus);

		order.status = newStatus;

		// Set timestamps for specific statuses
		if (newStatus === OrderStatus.PROCESSING && !order.startedAt) {
			order.startedAt = new Date();
		}

		if ([OrderStatus.COMPLETED, OrderStatus.FAILED, OrderStatus.CANCELLED].includes(newStatus) && !order.completedAt) {
			order.completedAt = new Date();
		}

		return this.orderRepository.save(order);
	}

	/**
	 * Create new order - SIMPLIFIED (no snapshot creation)
	 * Content extraction happens on-the-fly in worker
	 */
	public async createOrder(hostname: string): Promise<Order> {
		const session = this.usersService.getSessionData();
		const urls = await this.crawlersService.getAllSitemapUrls(hostname);

		if (!urls.length) {
			throw new BadRequestException('Sitemap did not return any URLs');
		}

		const order = this.orderRepository.create({
			hostname,
			sessionId: session.sessionId,
			userId: session.userId,
			totalUrls: urls.length,
			status: OrderStatus.CREATED
		});

		return this.orderRepository.save(order);
	}

	/**
	 * Get order(s) for current user/session
	 * Validates ownership via SQL where clause
	 */
	public async getUserOrders(): Promise<Order[]>;
	public async getUserOrders(id: number): Promise<Order>;
	public async getUserOrders(id?: number): Promise<Order | Order[]> {
		const session = this.usersService.getSessionData();

		// Build base ownership conditions
		const ownershipWhere = session.userId
			? [{ userId: session.userId }, { sessionId: session.sessionId }]
			: [{ sessionId: session.sessionId }];

		// Get single order by ID
		if (id !== undefined) {
			const where = session.userId
				? [{ id, userId: session.userId }, { id, sessionId: session.sessionId }]
				: { id, sessionId: session.sessionId };

			const order = await this.orderRepository.findOne({ where });

			if (!order) {
				throw new NotFoundException(`Order with ID ${id} not found or you don't have access to it`);
			}

			return order;
		}

		// Get all orders
		return this.orderRepository.find({
			where: ownershipWhere,
			order: { createdAt: 'DESC' }
		});
	}

	/**
	 * Find order by ID without ownership check (for internal use)
	 */
	public async findById(id: number): Promise<Order> {
		const order = await this.orderRepository.findOne({ where: { id } });

		if (!order) {
			throw new NotFoundException(`Order with ID ${id} not found`);
		}

		return order;
	}

	/**
	 * Ensure order is ready for payment
	 * Validates ownership, status, and price information
	 */
	public async ensureOrderPayable(orderId: number): Promise<Order> {
		// 1. Check ownership
		const order = await this.getUserOrders(orderId);

		// 2. Check status (must be PENDING_PAYMENT)
		if (order.status !== OrderStatus.PENDING_PAYMENT) {
			throw new BadRequestException(`Order ${orderId} is not pending payment (current status: ${order.status})`);
		}

		// 3. Check price information
		if (!order.priceTotal || !order.priceCurrency) {
			throw new BadRequestException(`Order ${orderId} has no price information`);
		}

		return order;
	}

	/**
	 * Get existing or create new Checkout Session
	 * Checks if order has active session, returns existing or creates new one
	 */
	public async getOrCreateCheckoutSession(orderId: number, successUrl: string, cancelUrl: string): Promise<string> {
		const order = await this.ensureOrderPayable(orderId);

		// Check if order already has an active Checkout Session
		if (order.stripeSessionId) {
			const existingStatus = await this.stripeService.checkSessionStatus(order.stripeSessionId);

			// If session is still open, return existing sessionId
			if (existingStatus === StripeSessionStatus.OPEN) {
				return order.stripeSessionId;
			}
		}

		// Create new Checkout Session
		const sessionId = await this.stripeService.createCheckoutSession(
			orderId,
			order.priceTotal,
			order.priceCurrency,
			successUrl,
			cancelUrl
		);

		// Save sessionId to Order
		await this.updateStripeSession(orderId, sessionId);

		return sessionId;
	}

	/**
	 * Get existing or create new Payment Intent
	 * Checks if order has active intent, returns existing or creates new one
	 */
	public async getOrCreatePaymentIntent(orderId: number): Promise<string> {
		const order = await this.ensureOrderPayable(orderId);

		// Check if order already has an active Payment Intent
		if (order.stripePaymentIntentSecret) {
			const existingStatus = await this.stripeService.checkPaymentIntentStatus(order.stripePaymentIntentSecret);

			// If payment intent is still open, return existing clientSecret
			if (existingStatus === StripeSessionStatus.OPEN) {
				return order.stripePaymentIntentSecret;
			}
		}

		// Create new Payment Intent
		const clientSecret = await this.stripeService.createPaymentIntent(
			orderId,
			order.priceTotal,
			order.priceCurrency
		);

		// Save client_secret to Order
		await this.updateStripePaymentIntent(orderId, clientSecret);

		return clientSecret;
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
