import { HttpClient } from './api.service';
import { configService } from './config.service';
import {
	CreateOrderRequestDto,
	CreateOrderResponseDto,
	OrderResponseDto,
	OrdersListResponseDto,
	AvailableAiModelDto,
	DownloadOrderResponseDto,
	HateoasAction,
	type ApiResponse
} from '@api/shared';

/**
 * Orders API Service
 * Handles order creation, retrieval, and management
 */
class OrdersService extends HttpClient {
	/**
	 * Create new order
	 */
	async create(dto: CreateOrderRequestDto): Promise<ApiResponse<CreateOrderResponseDto>> {
		return this.fetch(configService.endpoints.orders.base, CreateOrderResponseDto, {
			method: 'POST',
			body: JSON.stringify(dto)
		});
	}

	/**
	 * Get order by ID
	 */
	async getById(id: number): Promise<ApiResponse<OrderResponseDto>> {
		return this.fetch(configService.endpoints.orders.byId(id), OrderResponseDto);
	}

	/**
	 * Get available AI models for an order
	 */
	async getAvailableModels(id: number): Promise<ApiResponse<AvailableAiModelDto[]>> {
		return this.fetch(configService.endpoints.orders.availableModels(id), AvailableAiModelDto);
	}

	/**
	 * Calculate order with selected AI model
	 */
	async calculate(id: number, modelId: string): Promise<ApiResponse<OrderResponseDto>> {
		return this.fetch(configService.endpoints.orders.calculate(id), OrderResponseDto, {
			method: 'POST',
			body: JSON.stringify({ modelId })
		});
	}

	/**
	 * Get all user orders (history)
	 */
	async getAll(page: number = 1, limit: number = 5): Promise<ApiResponse<OrdersListResponseDto>> {
		const params = new URLSearchParams({
			page: page.toString(),
			limit: limit.toString()
		});
		return this.fetch(
			`${configService.endpoints.orders.base}?${params}`,
			OrdersListResponseDto
		);
	}

	/**
	 * Start order processing with selected model
	 */
	async start(id: number, modelId: string): Promise<ApiResponse<OrderResponseDto>> {
		return this.fetch(configService.endpoints.orders.run(id), OrderResponseDto, {
			method: 'POST',
			body: JSON.stringify({ modelId })
		});
	}

	/**
	 * Download generated LLMs.txt file
	 * Returns file content and filename from API
	 */
	async download(id: number): Promise<ApiResponse<DownloadOrderResponseDto>> {
		return this.fetch(configService.endpoints.orders.download(id), DownloadOrderResponseDto);
	}

	/**
	 * Delete order (soft delete)
	 */
	async deleteOrder(id: number): Promise<ApiResponse<void>> {
		return this.fetch(configService.endpoints.orders.byId(id), undefined, {
			method: 'DELETE'
		});
	}

	/**
	 * Check if specific action is available for order based on HATEOAS _links
	 */
	hasAction(order: OrderResponseDto, action: HateoasAction): boolean {
		return !!(order._links && action in order._links);
	}

	/**
	 * Get available actions for order
	 */
	getAvailableActions(order: OrderResponseDto): string[] {
		if (!order._links) return [];
		return Object.keys(order._links);
	}
}

// Singleton instance
const ordersService = new OrdersService();
export { ordersService };
