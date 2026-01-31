import { CrawlersService } from '../../crawlers/services/crawlers.service';
import { Currency } from '../../../enums/currency.enum';
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '../../../enums/order-status.enum';
import { OrderStatusMachine } from '../utils/order-status-machine';
import { Repository } from 'typeorm';
import { SnapshotService } from '../../content/services/snapshot.service';

@Injectable()
class OrdersService {
	constructor(
		@InjectRepository(Order)
		private readonly orderRepository: Repository<Order>,
		private readonly crawlersService: CrawlersService,
		private readonly snapshotService: SnapshotService
	) { }

	/**
	 * Create new order
	 */
	async createOrder(hostname: string, sessionId: string, userId?: number): Promise<Order> {
		const urls = await this.crawlersService.getAllSitemapUrls(hostname);

		if (!urls.length) {
			throw new Error('Sitemap did not return any URLs');
		}

		const order = this.orderRepository.create({
			hostname,
			sessionId,
			userId,
			totalUrls: urls.length,
			status: OrderStatus.CREATED
		});

		const savedOrder = await this.orderRepository.save(order);
		await this.createSnapshotsForOrder(savedOrder.id, urls);
		return savedOrder;
	}

	/**
	 * Создаёт снапшоты для всех URL из sitemap по orderId
	 */
	async createSnapshotsForOrder(orderId: number, urls: string[]): Promise<void> {
		await this.snapshotService.createSnapshot(orderId, urls, 10);
	}

	/**
	 * Get order by ID
	 * Validates ownership (sessionId or userId must match)
	 */
	async getOrderById(id: number, sessionId: string, userId?: number): Promise<Order> {
		const order = await this.orderRepository.findOne({
			where: { id },
			relations: ['snapshotUrls']
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
	async getUserOrders(sessionId: string, userId?: number): Promise<Order[]> {
		const where = userId
			? [{ userId }, { sessionId }]
			: [{ sessionId }];

		return this.orderRepository.find({
			where,
			order: { createdAt: 'DESC' },
			relations: ['snapshotUrls']
		});
	}

	/**
	 * Start order with selected model
	 */
	async startOrder(orderId: number, modelId: string, priceTotal: number, pricePerUrl: number, priceCurrency: Currency, totalUrls: number): Promise<Order> {
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

		// Update order with pricing and model
		order.modelId = modelId;
		order.priceTotal = priceTotal;
		order.pricePerUrl = pricePerUrl;
		order.priceCurrency = priceCurrency;
		order.totalUrls = totalUrls;

		// Determine next status based on price
		if (priceTotal === 0) {
			// Free model - go directly to queue
			OrderStatusMachine.validateTransition(order.status, OrderStatus.QUEUED);
			order.status = OrderStatus.QUEUED;
		} else {
			// Paid model - wait for payment
			OrderStatusMachine.validateTransition(order.status, OrderStatus.PENDING_PAYMENT);
			order.status = OrderStatus.PENDING_PAYMENT;
		}

		return this.orderRepository.save(order);
	}

	/**
	 * Update order status with validation
	 */
	async updateOrderStatus(orderId: number, newStatus: OrderStatus): Promise<Order> {
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
	 * Update processing progress
	 */
	async updateProgress(orderId: number, processedUrls: number): Promise<void> {
		await this.orderRepository.update(
			{ id: orderId },
			{ processedUrls }
		);
	}

	/**
	 * Update order output (llms.txt content)
	 */
	async updateOutput(orderId: number, output: string, llmsEntriesCount: number): Promise<void> {
		await this.orderRepository.update(
			{ id: orderId },
			{ output, llmsEntriesCount }
		);
	}

	/**
	 * Add error to order
	 */
	async addError(orderId: number, error: string): Promise<void> {
		const order = await this.orderRepository.findOne({
			where: { id: orderId }
		});

		if (!order) {
			throw new NotFoundException(`Order with ID ${orderId} not found`);
		}

		const errors = order.errors ?? [];
		errors.push({
			message: error
		});

		await this.orderRepository.update(
			{ id: orderId },
			{ errors }
		);
	}

	/**
	 * Update Stripe session ID
	 */
	async updateStripeSession(orderId: number, stripeSessionId: string): Promise<void> {
		await this.orderRepository.update(
			{ id: orderId },
			{ stripeSessionId }
		);
	}

	/**
	 * Update Stripe Payment Intent secret
	 */
	async updateStripePaymentIntent(orderId: number, stripePaymentIntentSecret: string): Promise<void> {
		await this.orderRepository.update(
			{ id: orderId },
			{ stripePaymentIntentSecret }
		);
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
