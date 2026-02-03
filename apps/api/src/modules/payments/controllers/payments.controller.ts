import {
	Controller,
	Post,
	Param,
	Body,
	ParseIntPipe,
	BadRequestException,
	RawBodyRequest,
	Req,
	Headers
} from '@nestjs/common';
import { CreateCheckoutRequestDto } from '../dto/payment-request.dto';
import { StripeService } from '../services/stripe.service';
import { OrdersService } from '../../orders/services/orders.service';
import { UsersService } from '../../users/services/users.service';
import { OrderStatus } from '../../../enums/order-status.enum';
import { ApiResponse } from '../../../utils/response/api-response';
import { MessageSuccess } from '../../../utils/response/message-success';
import type { FastifyRequest } from 'fastify';

@Controller('api/orders/:orderId/payment')
class PaymentsController {
	constructor(
		private readonly stripeService: StripeService,
		private readonly ordersService: OrdersService,
		private readonly usersService: UsersService
	) { }

	/**
	 * POST /api/orders/:orderId/payment/checkout
	 * Создаёт Stripe Checkout Session и возвращает sessionId
	 */
	@Post('checkout')
	public async createCheckoutSession(
		@Param('orderId', ParseIntPipe) orderId: number,
		@Body() dto: CreateCheckoutRequestDto
	): Promise<ApiResponse<MessageSuccess<{ sessionId: string }>>> {
		const sessionId = await this.ordersService.getOrCreateCheckoutSession(
			orderId,
			dto.successUrl,
			dto.cancelUrl
		);

		return ApiResponse.success({ sessionId });
	}

	/**
	 * POST /api/orders/:orderId/payment/intent
	/**
	 * POST /api/orders/:orderId/payment/intent
	 * Создаёт Payment Intent для встроенной формы оплаты
	 */
	@Post('intent')
	public async createPaymentIntent(@Param('orderId', ParseIntPipe) orderId: number): Promise<ApiResponse<MessageSuccess<{ clientSecret: string }>>> {
		const clientSecret = await this.ordersService.getOrCreatePaymentIntent(orderId);

		return ApiResponse.success({ clientSecret });
	}

	/**
	 * POST /api/orders/:orderId/payment/refund
	 * Запрашивает возврат средств за заказ
	 */
	@Post('refund')
	public async requestRefund(@Param('orderId', ParseIntPipe) orderId: number): Promise<ApiResponse<MessageSuccess>> {
		// 1. Проверить владение заказом
		const order = await this.ordersService.getUserOrders(orderId);

		// 2. Проверить что заказ может быть возвращён (FAILED или COMPLETED с ошибками)
		if (order.status !== OrderStatus.FAILED) {
			throw new BadRequestException(`Order ${orderId} cannot be refunded (current status: ${order.status})`);
		}

		// 3. Проверить что есть Payment Intent для возврата
		if (!order.stripePaymentIntentSecret) {
			throw new BadRequestException(`Order ${orderId} has no payment information`);
		}

		// 4. Извлечь Payment Intent ID из client_secret
		const paymentIntentId = order.stripePaymentIntentSecret.split('_secret_')[0];

		// 5. Создать Refund
		await this.stripeService.createRefund(paymentIntentId);

		// 6. Обновить статус Order на REFUNDED
		await this.ordersService.updateOrderStatus(orderId, OrderStatus.REFUNDED);

		return ApiResponse.success('Refund has been processed successfully');
	}

	/**
	 * POST /api/payments/webhook
	 * Обработчик Stripe webhooks
	 */
	@Post('/webhook')
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

export { PaymentsController };
