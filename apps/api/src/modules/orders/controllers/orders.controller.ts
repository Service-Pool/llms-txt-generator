import { ApiResponse } from '../../../utils/response/api-response';
import { Controller, Post, Get, Query, Body, Param, HttpCode, HttpStatus, Res, ParseIntPipe } from '@nestjs/common';
import { CreateOrderRequestDto, CalculateOrderRequestDto } from '../dto/order-request.dto';
import { FastifyReply } from 'fastify';
import { AiModelsConfigService } from '../../ai-models/services/ai-models-config.service';
import { AvailableAiModelDto } from '../../ai-models/dto/available-ai-model.dto';
import { CreateOrderResponseDto, OrderResponseDto, OrdersListResponseDto } from '../dto/order-response.dto';
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
	public async createOrder(@Body() dto: CreateOrderRequestDto): Promise<ApiResponse<CreateOrderResponseDto>> {
		const order = await this.ordersService.createOrder(dto.hostname);
		const availableAiModels = this.ordersService.getAvailableAiModels(order);
		return ApiResponse.success(CreateOrderResponseDto.create(order, availableAiModels));
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
	): Promise<ApiResponse<OrderResponseDto>> {
		const updatedOrder = await this.ordersService.calculateOrder(id, dto.modelId);
		return ApiResponse.success(OrderResponseDto.create(updatedOrder));
	}

	/**
	 * Run order with selected model
	 * POST /api/orders/:id/run
	 */
	@Post(':id/run')
	@HttpCode(HttpStatus.OK)
	public async runOrder(@Param('id', ParseIntPipe) id: number): Promise<ApiResponse<OrderResponseDto>> {
		const updatedOrder = await this.ordersService.runOrder(id);
		return ApiResponse.success(OrderResponseDto.create(updatedOrder));
	}

	/**
	 * Get all orders for current user/session
	 * GET /api/orders
	 */
	@Get()
	@HttpCode(HttpStatus.OK)
	public async getOrders(@Query('page') page: number = 1, @Query('limit') limit: number = 5): Promise<ApiResponse<OrdersListResponseDto>> {
		const result = await this.ordersService.getUserOrders(page, limit);

		// TypeScript narrowing: result is { orders: Order[]; total: number }
		if ('orders' in result) {
			// TODO: For orders in PENDING_PAYMENT status - poll Stripe for payment status
			return ApiResponse.success(OrdersListResponseDto.create(result.orders, result.total, page, limit));
		}

		throw new Error('Unexpected result from getUserOrders');
	}

	/**
	 * Get single order by ID
	 * GET /api/orders/:id
	 */
	@Get(':id')
	@HttpCode(HttpStatus.OK)
	public async getOrder(@Param('id', ParseIntPipe) id: number): Promise<ApiResponse<OrderResponseDto>> {
		const order = await this.ordersService.getUserOrder(id);

		return ApiResponse.success(OrderResponseDto.create(order));
	}

	/**
	 * Get available AI models for an order
	 * GET /api/orders/:id/available-models
	 */
	@Get(':id/available-models')
	@HttpCode(HttpStatus.OK)
	public async getAvailableAiModels(@Param('id', ParseIntPipe) id: number): Promise<ApiResponse<AvailableAiModelDto[]>> {
		const order = await this.ordersService.getUserOrder(id);
		const availableAiModels = this.ordersService.getAvailableAiModels(order);
		return ApiResponse.success(availableAiModels);
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
		const order = await this.ordersService.getUserOrder(id);

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
