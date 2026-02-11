import { ApiResponse } from '../../../utils/response/api-response';
import { HttpStatus } from '../../../enums/response-code.enum';
import { Controller, Post, Get, Query, Body, Param, HttpCode, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { CreateOrderRequestDto, CalculateOrderRequestDto, DownloadOrderRequestDto } from '../dto/order-request.dto';
import { AvailableAiModelDto } from '../../ai-models/dto/available-ai-model.dto';
import { CreateOrderResponseDto, OrderResponseDto, OrdersListResponseDto, DownloadOrderResponseDto } from '../dto/order-response.dto';
import { OrdersService } from '../services/orders.service';

@ApiTags('Orders')
@Controller('api/orders')
class OrdersController {
	constructor(private readonly ordersService: OrdersService) { }

	/**
	 * Create new order
	 * POST /api/orders
	 */
	@ApiOperation({ summary: 'Create new order', description: 'Creates a new order for the specified website hostname' })
	@ApiBody({ type: CreateOrderRequestDto, description: 'Order creation data' })
	@SwaggerResponse({
		status: HttpStatus.CREATED,
		schema: ApiResponse.getSuccessSchema(CreateOrderResponseDto)
	})
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
	@ApiOperation({ summary: 'Calculate order price', description: 'Calculates order pricing for the selected AI model' })
	@ApiParam({ name: 'id', type: 'number', description: 'Order ID' })
	@ApiBody({ type: CalculateOrderRequestDto, description: 'Model selection for price calculation' })
	@SwaggerResponse({
		status: HttpStatus.OK,
		schema: ApiResponse.getSuccessSchema(OrderResponseDto)
	})
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
	@ApiOperation({ summary: 'Run order processing', description: 'Starts the order processing based on current status (payment handling or queuing)' })
	@ApiParam({ name: 'id', type: 'number', description: 'Order ID' })
	@SwaggerResponse({
		status: HttpStatus.OK,
		schema: ApiResponse.getSuccessSchema(OrderResponseDto)
	})
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
	@ApiOperation({ summary: 'Get user orders', description: 'Retrieves paginated list of orders for the current user or session' })
	@ApiQuery({ name: 'page', type: 'number', required: false, description: 'Page number (default: 1)' })
	@ApiQuery({ name: 'limit', type: 'number', required: false, description: 'Items per page (default: 5)' })
	@SwaggerResponse({
		status: HttpStatus.OK,
		schema: ApiResponse.getSuccessSchema(OrdersListResponseDto)
	})
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
	@ApiOperation({ summary: 'Get order details', description: 'Retrieves detailed information about a specific order' })
	@ApiParam({ name: 'id', type: 'number', description: 'Order ID' })
	@SwaggerResponse({
		status: HttpStatus.OK,
		schema: ApiResponse.getSuccessSchema(OrderResponseDto)
	})
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
	@ApiOperation({ summary: 'Get available AI models', description: 'Returns list of AI models available for the specific order' })
	@ApiParam({ name: 'id', type: 'number', description: 'Order ID' })
	@SwaggerResponse({
		status: HttpStatus.OK,
		schema: ApiResponse.getSuccessSchema(AvailableAiModelDto, true)
	})
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
	@ApiOperation({ summary: 'Download llms.txt file', description: 'Downloads the generated llms.txt file for a completed order' })
	@ApiParam({ name: 'id', type: 'number', description: 'Order ID' })
	@SwaggerResponse({
		status: HttpStatus.OK,
		schema: ApiResponse.getSuccessSchema(DownloadOrderResponseDto)
	})
	@Get(':id/download')
	@HttpCode(HttpStatus.OK)
	public async downloadLlmsTxt(@Param() dto: DownloadOrderRequestDto): Promise<ApiResponse<DownloadOrderResponseDto>> {
		const order = await this.ordersService.getUserOrder(dto.id);
		return ApiResponse.success(DownloadOrderResponseDto.create(`llms-${order.hostname}.txt`, order.output));
	}
}

export { OrdersController };
