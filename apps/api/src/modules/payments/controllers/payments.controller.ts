import {
	Controller,
	Post,
	Param,
	Body,
	ParseIntPipe,
	BadRequestException,
	UseGuards
} from '@nestjs/common';
import { ApiResponse } from '../../../utils/response/api-response';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { SessionGuard } from '../../auth/guards/session.guard';
import { AppConfigService } from '../../../config/config.service';
import { CheckoutSessionResponseDto, PaymentIntentResponseDto } from '../dto/payment-response.dto';
import { CreateCheckoutRequestDto } from '../dto/payment-request.dto';
import { HttpStatus } from '../../../enums/response-code.enum';
import { OrdersService } from '../../orders/services/orders.service';
import { OrderStatus } from '../../../enums/order-status.enum';
import { StripeService } from '../services/stripe.service';

@ApiTags('Payments')
@Controller('api/orders/:orderId/payment')
class PaymentsController {
	constructor(
		private readonly stripeService: StripeService,
		private readonly ordersService: OrdersService,
		private readonly configService: AppConfigService
	) { }

	/**
	 * POST /api/orders/:orderId/payment/checkout
	 * Создаёт Stripe Checkout Session и возвращает sessionId
	 */
	@UseGuards(SessionGuard)
	@ApiOperation({ summary: 'Create checkout session', description: 'Creates Stripe Checkout session for order payment' })
	@ApiParam({ name: 'orderId', type: 'number', description: 'Order ID' })
	@ApiBody({ type: CreateCheckoutRequestDto })
	@SwaggerResponse({
		status: HttpStatus.OK,
		description: 'Checkout session created',
		schema: ApiResponse.getSuccessSchema(CheckoutSessionResponseDto)
	})
	@Post('checkout')
	public async createCheckoutSession(
		@Param('orderId', ParseIntPipe) orderId: number,
		@Body() dto: CreateCheckoutRequestDto
	): Promise<ApiResponse<CheckoutSessionResponseDto>> {
		const session = await this.ordersService.getOrCreateCheckoutSession(
			orderId,
			dto.successUrl,
			dto.cancelUrl
		);

		return ApiResponse.success(CheckoutSessionResponseDto.create(orderId, session.sessionId, session.url));
	}

	/**
	 * POST /api/orders/:orderId/payment/intent
	 * Создаёт Payment Intent для встроенной формы оплаты
	 */
	@UseGuards(SessionGuard)
	@ApiOperation({ summary: 'Create payment intent', description: 'Creates Stripe Payment Intent for embedded payment form' })
	@ApiParam({ name: 'orderId', type: 'number', description: 'Order ID' })
	@SwaggerResponse({
		status: HttpStatus.OK,
		description: 'Payment intent created',
		schema: ApiResponse.getSuccessSchema(PaymentIntentResponseDto)
	})
	@Post('intent')
	public async createPaymentIntent(@Param('orderId', ParseIntPipe) orderId: number): Promise<ApiResponse<PaymentIntentResponseDto>> {
		const clientSecret = await this.ordersService.getOrCreatePaymentIntent(orderId);
		const publishableKey = this.configService.stripe.publishableKey;

		return ApiResponse.success(PaymentIntentResponseDto.create(orderId, clientSecret, publishableKey));
	}

	/**
	 * POST /api/orders/:orderId/payment/refund
	 * Запрашивает возврат средств за заказ
	 */
	@UseGuards(SessionGuard)
	@ApiOperation({ summary: 'Request refund', description: 'Requests refund for a failed order' })
	@ApiParam({ name: 'orderId', type: 'number', description: 'Order ID' })
	@SwaggerResponse({
		status: HttpStatus.OK,
		description: 'Refund processed successfully',
		schema: {
			type: 'object',
			properties: {
				success: { type: 'boolean', example: true },
				message: { type: 'string', example: 'Operation completed successfully' },
				data: { type: 'string', example: 'Refund has been processed successfully' }
			}
		}
	})
	@Post('refund')
	public async requestRefund(@Param('orderId', ParseIntPipe) orderId: number): Promise<ApiResponse<string>> {
		// 1. Проверить владение заказом
		const order = await this.ordersService.getUserOrder(orderId);

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
}

export { PaymentsController };
