import { HttpClient } from './api.service';
import { configService } from './config.service';
import {
	CreateOrderRequestDto,
	CreateOrderResponseDto,
	OrderResponseDto,
	OrdersListResponseDto,
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
	 * Get all user orders (history)
	 */
	async getAll(): Promise<ApiResponse<OrdersListResponseDto>> {
		return this.fetch(configService.endpoints.orders.base, OrdersListResponseDto);
	}

	/**
	 * Start order processing with selected model
	 */
	async start(id: number, modelId: number): Promise<ApiResponse<OrderResponseDto>> {
		return this.fetch(configService.endpoints.orders.run(id), OrderResponseDto, {
			method: 'POST',
			body: JSON.stringify({ modelId })
		});
	}

	/**
	 * Download generated LLMs.txt file
	 * Returns Blob for file download
	 */
	async download(id: number): Promise<Blob> {
		const response = await fetch(`${this.baseUrl}${configService.endpoints.orders.download(id)}`, {
			credentials: 'include'
		});

		if (!response.ok) {
			throw new Error('Failed to download file');
		}

		return response.blob();
	}
}

// Singleton instance
export const ordersService = new OrdersService();
