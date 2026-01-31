import {
	Controller,
	Post,
	Param,
	Body,
	ParseIntPipe,
	Session,
	BadRequestException,
	NotFoundException,
	RawBodyRequest,
	Req,
	Headers
} from '@nestjs/common';
import { CreateCheckoutRequestDto } from '../dto/payment-request.dto';
import { StripeService } from '../services/stripe.service';
import { OrdersService } from '../../orders/services/orders.service';
import { OrderStatus } from '../../../enums/order-status.enum';
import { ApiResponse } from '../../../utils/response/api-response';
import { MessageSuccess } from '../../../utils/response/message-success';
import type { FastifyRequest } from 'fastify';
import { type Session as SessionType } from 'fastify';

@Controller('api/orders/:orderId/payment')
export class PaymentsController {
	constructor(
		private readonly stripeService: StripeService,
		private readonly ordersService: OrdersService
	) { }

	/**
	 * POST /api/orders/:orderId/payment/checkout
	 * Создаёт Stripe Checkout Session и возвращает sessionId
	 */
	@Post('checkout')
	async createCheckoutSession(
		@Param('orderId', ParseIntPipe) orderId: number,
		@Body() dto: CreateCheckoutRequestDto,
		@Session() session: SessionType
	): Promise<ApiResponse<MessageSuccess<{ sessionId: string }>>> {
		// 1. Проверить владение заказом
		const order = await this.ordersService.getOrderById(
			orderId,
			session.sessionId,
			session.userId
		);

		if (!order) {
			throw new NotFoundException(`Order ${orderId} not found`);
		}

		// 2. Проверить статус (должен быть PENDING_PAYMENT)
		if (order.status !== OrderStatus.PENDING_PAYMENT) {
			throw new BadRequestException(`Order ${orderId} is not pending payment (current status: ${order.status})`);
		}

		// 3. Проверить что цена установлена
		if (!order.priceTotal || !order.priceCurrency) {
			throw new BadRequestException(`Order ${orderId} has no price information`);
		}

		// 4. Создать Checkout Session
		const sessionId = await this.stripeService.createCheckoutSession(
			orderId,
			order.priceTotal,
			order.priceCurrency.toLowerCase(),
			dto.successUrl,
			dto.cancelUrl
		);

		// 5. Сохранить sessionId в Order
		await this.ordersService.updateStripeSession(orderId, sessionId);

		return ApiResponse.success({ sessionId });
	}

	/**
	 * POST /api/orders/:orderId/payment/intent
	 * Создаёт Payment Intent для встроенной формы оплаты
	 */
	@Post('intent')
	async createPaymentIntent(
		@Param('orderId', ParseIntPipe) orderId: number,
		@Session() session: SessionType
	): Promise<ApiResponse<MessageSuccess<{ clientSecret: string }>>> {
		// 1. Проверить владение заказом
		const order = await this.ordersService.getOrderById(
			orderId,
			session.sessionId,
			session.userId
		);

		if (!order) {
			throw new NotFoundException(`Order ${orderId} not found`);
		}

		// 2. Проверить статус (должен быть PENDING_PAYMENT)
		if (order.status !== OrderStatus.PENDING_PAYMENT) {
			throw new BadRequestException(`Order ${orderId} is not pending payment (current status: ${order.status})`);
		}

		// 3. Проверить что цена установлена
		if (!order.priceTotal || !order.priceCurrency) {
			throw new BadRequestException(`Order ${orderId} has no price information`);
		}

		// 4. Создать Payment Intent
		const clientSecret = await this.stripeService.createPaymentIntent(
			orderId,
			order.priceTotal,
			order.priceCurrency.toLowerCase()
		);

		// 5. Сохранить client_secret в Order
		await this.ordersService.updateStripePaymentIntent(orderId, clientSecret);

		return ApiResponse.success({ clientSecret });
	}

	/**
	 * POST /api/orders/:orderId/payment/refund
	 * Запрашивает возврат средств за заказ
	 */
	@Post('refund')
	async requestRefund(
		@Param('orderId', ParseIntPipe) orderId: number,
		@Session() session: SessionType
	): Promise<ApiResponse<MessageSuccess>> {
		// 1. Проверить владение заказом
		const order = await this.ordersService.getOrderById(
			orderId,
			session.sessionId,
			session.userId
		);

		if (!order) {
			throw new NotFoundException(`Order ${orderId} not found`);
		}

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
	async handleWebhook(
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

				// Обновить статус Order на PAID
				await this.ordersService.updateOrderStatus(orderId, OrderStatus.PAID);

				// TODO: Добавить Order в очередь генерации (будет реализовано в Этап 8)
				// await this.queueService.addOrderToQueue(orderId, queueName);

				break;
			}

			case 'payment_intent.succeeded': {
				const paymentIntent = event.data.object;
				const orderId = parseInt(paymentIntent.metadata.orderId, 10);

				// Обновить статус Order на PAID
				await this.ordersService.updateOrderStatus(orderId, OrderStatus.PAID);

				// TODO: Добавить Order в очередь генерации (будет реализовано в Этап 8)
				// await this.queueService.addOrderToQueue(orderId, queueName);

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
