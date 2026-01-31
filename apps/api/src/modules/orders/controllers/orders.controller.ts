import { ApiResponse } from '../../../utils/response/api-response';
import { ClsService } from 'nestjs-cls';
import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { CreateOrderRequestDto, StartOrderRequestDto } from '../dto/order-request.dto';
import { Currency } from '../../../enums/currency.enum';
import { FastifyReply } from 'fastify';
import { MessageSuccess } from '../../../utils/response/message-success';
import { Order } from '../entities/order.entity';
import { OrderResponseDto } from '../dto/order-response.dto';
import { OrdersService } from '../services/orders.service';

@Controller('api/orders')
class OrdersController {
	constructor(
		private readonly ordersService: OrdersService,
		private readonly cls: ClsService
	) { }

	/**
	 * Create new order
	 * POST /api/orders
	 */
	@Post()
	@HttpCode(HttpStatus.CREATED)
	async createOrder(@Body() dto: CreateOrderRequestDto): Promise<ApiResponse<MessageSuccess<OrderResponseDto>>> {
		const sessionId = this.cls.get('sessionId');
		const userId = this.cls.get('userId');

		// Создать заказ и сразу создать снапшоты для всех URL
		const order = await this.ordersService.createOrder(
			dto.hostname,
			sessionId,
			userId
		);

		return ApiResponse.success(OrderResponseDto.fromEntity(order));
	}

	/**
	 * Start order with selected model
	 * POST /api/orders/:id/start
	 */
	@Post(':id/start')
	@HttpCode(HttpStatus.OK)
	async startOrder(
		@Param('id') id: number,
		@Body() dto: StartOrderRequestDto
	): Promise<ApiResponse<MessageSuccess<OrderResponseDto>>> {
		const sessionId = this.cls.get('sessionId');
		const userId = this.cls.get('userId');

		// Validate ownership
		const order = await this.ordersService.getOrderById(id, sessionId, userId);

		// TODO: Calculate pricing based on model and snapshot URLs count
		// TODO: Get model pricing from ModelsConfigService
		const pricePerUrl = 0; // Temporary - will be calculated
		const priceTotal = 0; // Temporary - will be calculated
		const priceCurrency = Currency.EUR; // Temporary
		const totalUrls = order.snapshotUrls?.length || 0;

		const updatedOrder = await this.ordersService.startOrder(
			id,
			dto.modelId,
			priceTotal,
			pricePerUrl,
			priceCurrency,
			totalUrls
		);

		return ApiResponse.success(OrderResponseDto.fromEntity(updatedOrder));
	}

	/**
	 * Get all orders for current user/session
	 * GET /api/orders
	 */
	@Get()
	@HttpCode(HttpStatus.OK)
	async getOrders(): Promise<ApiResponse<MessageSuccess<OrderResponseDto[]>>> {
		const sessionId = this.cls.get('sessionId');
		const userId = this.cls.get('userId');

		const orders = await this.ordersService.getUserOrders(sessionId, userId);

		// TODO: For orders in PENDING_PAYMENT status - poll Stripe for payment status

		return ApiResponse.success(orders.map((order: Order) => OrderResponseDto.fromEntity(order)));
	}

	/**
	 * Get single order by ID
	 * GET /api/orders/:id
	 */
	@Get(':id')
	@HttpCode(HttpStatus.OK)
	async getOrder(@Param('id') id: number): Promise<ApiResponse<MessageSuccess<OrderResponseDto>>> {
		const sessionId = this.cls.get('sessionId');
		const userId = this.cls.get('userId');

		const order = await this.ordersService.getOrderById(id, sessionId, userId);

		return ApiResponse.success(OrderResponseDto.fromEntity(order));
	}

	/**
	 * Download llms.txt file for completed order
	 * GET /api/orders/:id/download
	 */
	@Get(':id/download')
	async downloadLlmsTxt(
		@Param('id') id: number,
		@Res() res: FastifyReply
	): Promise<void> {
		const sessionId = this.cls.get('sessionId');
		const userId = this.cls.get('userId');

		const order = await this.ordersService.getOrderById(id, sessionId, userId);

		if (!order.output) {
			res.code(404).send({
				statusCode: 404,
				message: 'Order output not available yet'
			});
			return;
		}

		// Set headers for file download
		res.header('Content-Type', 'text/plain');
		res.header('Content-Disposition', `attachment; filename="llms-${order.hostname}.txt"`);

		res.send(order.output);
	}
}

export { OrdersController };
