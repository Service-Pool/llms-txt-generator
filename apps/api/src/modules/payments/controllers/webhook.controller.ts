import {
	Controller,
	Post,
	BadRequestException,
	RawBodyRequest,
	Req,
	Headers
} from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { OrdersService } from '../../orders/services/orders.service';
import { OrderStatus } from '../../../enums/order-status.enum';
import { StripeService } from '../services/stripe.service';
import { UsersService } from '../../users/services/users.service';
import type { FastifyRequest } from 'fastify';

@Controller('api/payments')
class WebhookController {
	constructor(
		private readonly stripeService: StripeService,
		private readonly ordersService: OrdersService,
		private readonly usersService: UsersService
	) { }

	/**
	 * POST /api/payments/webhook
	 * Обработчик Stripe webhooks
	 */
	@ApiExcludeEndpoint()
	@Post('stripe-webhook')
	public async handleWebhook(
		@Req() req: RawBodyRequest<FastifyRequest>,
		@Headers('stripe-signature') signature: string
	): Promise<{ received: boolean }> {
		if (!signature) {
			throw new BadRequestException('Missing stripe-signature header');
		}

		// 1. Верифицировать webhook signature
		const event = this.stripeService.constructWebhookEvent(
			req.rawBody,
			signature
		);

		// 2. Обработать событие
		switch (event.type) {
			case 'checkout.session.completed': {
				const session = event.data.object;
				const orderId = parseInt(session.metadata.orderId, 10);

				// Get order and update status to PAID
				const order = await this.ordersService.findById(orderId);
				if (!order.userId) {
					throw new BadRequestException('Order has no userId - cannot process webhook for anonymous order');
				}

				await this.ordersService.updateOrderStatus(orderId, OrderStatus.PAID);

				// Create temporary session and run order
				this.usersService.setTemporarySessionData(order.userId);
				try {
					// runOrder will use saved modelId and queue the order
					await this.ordersService.runOrder(orderId);
				} finally {
					this.usersService.clearSessionData();
				}

				break;
			}

			case 'payment_intent.succeeded': {
				const paymentIntent = event.data.object;
				const orderId = parseInt(paymentIntent.metadata.orderId, 10);

				// Get order and update status to PAID
				const order = await this.ordersService.findById(orderId);
				if (!order.userId) {
					throw new BadRequestException('Order has no userId - cannot process webhook for anonymous order');
				}

				await this.ordersService.updateOrderStatus(orderId, OrderStatus.PAID);

				// Create temporary session and run order
				this.usersService.setTemporarySessionData(order.userId);
				try {
					// runOrder will use saved modelId and queue the order
					await this.ordersService.runOrder(orderId);
				} finally {
					this.usersService.clearSessionData();
				}

				break;
			}

			case 'payment_intent.payment_failed': {
				const paymentIntent = event.data.object;
				const orderId = parseInt(paymentIntent.metadata.orderId, 10);

				// Обновить статус Order на PAYMENT_FAILED
				await this.ordersService.updateOrderStatus(
					orderId,
					OrderStatus.PAYMENT_FAILED
				);

				break;
			}

			default:
				// Игнорируем неизвестные события
				break;
		}

		return { received: true };
	}
}

export { WebhookController };
