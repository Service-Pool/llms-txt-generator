import { ApiResponse } from '../../../utils/response/api-response';
import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus, Res, ParseIntPipe } from '@nestjs/common';
import { CreateOrderRequestDto, CalculateOrderRequestDto } from '../dto/order-request.dto';
import { FastifyReply } from 'fastify';
import { MessageSuccess } from '../../../utils/response/message-success';
import { AiModelsConfigService } from '../../ai-models/services/ai-models-config.service';
import { Order } from '../entities/order.entity';
import { OrderResponseDto } from '../dto/order-response.dto';
import { OrdersService } from '../services/orders.service';

@Controller('api/orders')
class OrdersController {
	constructor(
		private readonly ordersService: OrdersService,
		private readonly aiModelsConfigService: AiModelsConfigService
	) { }

	/**
	 * Create new order
	 * POST /api/orders
	 */
	@Post()
	@HttpCode(HttpStatus.CREATED)
	public async createOrder(@Body() dto: CreateOrderRequestDto): Promise<ApiResponse<MessageSuccess<OrderResponseDto>>> {
		const order = await this.ordersService.createOrder(dto.hostname);

		// Calculate available models based on totalUrls
		const availableModels = this.aiModelsConfigService.getAvailableModels(
			order.totalUrls,
			!!order.userId
		);

		return ApiResponse.success(OrderResponseDto.fromEntity(order, availableModels));
	}

	/**
	 * Calculate order price with selected model
	 * POST /api/orders/:id/calculate
	 */
	@Post(':id/calculate')
	@HttpCode(HttpStatus.OK)
	public async calculateOrder(
		@Param('id', ParseIntPipe) id: number,
		@Body() dto: CalculateOrderRequestDto
	): Promise<ApiResponse<MessageSuccess<OrderResponseDto>>> {
		const updatedOrder = await this.ordersService.calculateOrder(id, dto.modelId);
		return ApiResponse.success(OrderResponseDto.fromEntity(updatedOrder));
	}

	/**
	 * Run order with selected model
	 * POST /api/orders/:id/run
	 */
	@Post(':id/run')
	@HttpCode(HttpStatus.OK)
	public async runOrder(@Param('id', ParseIntPipe) id: number): Promise<ApiResponse<MessageSuccess<OrderResponseDto>>> {
		const updatedOrder = await this.ordersService.runOrder(id);
		return ApiResponse.success(OrderResponseDto.fromEntity(updatedOrder));
	}

	/**
	 * Get all orders for current user/session
	 * GET /api/orders
	 */
	@Get()
	@HttpCode(HttpStatus.OK)
	public async getOrders(): Promise<ApiResponse<MessageSuccess<OrderResponseDto[]>>> {
		const orders = await this.ordersService.getUserOrders();

		// TODO: For orders in PENDING_PAYMENT status - poll Stripe for payment status

		return ApiResponse.success(orders.map((order: Order) => OrderResponseDto.fromEntity(order)));
	}

	/**
	 * Get single order by ID
	 * GET /api/orders/:id
	 */
	@Get(':id')
	@HttpCode(HttpStatus.OK)
	public async getOrder(@Param('id', ParseIntPipe) id: number): Promise<ApiResponse<MessageSuccess<OrderResponseDto>>> {
		const order = await this.ordersService.getUserOrders(id);

		return ApiResponse.success(OrderResponseDto.fromEntity(order));
	}

	/**
	 * Download llms.txt file for completed order
	 * GET /api/orders/:id/download
	 */
	@Get(':id/download')
	public async downloadLlmsTxt(
		@Param('id', ParseIntPipe) id: number,
		@Res() res: FastifyReply
	): Promise<void> {
		const order = await this.ordersService.getUserOrders(id);

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
