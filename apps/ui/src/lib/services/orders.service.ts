import { HttpClient } from './api.service';
import { configService } from './config.service';
import {
	CreateOrderRequestDto,
	CreateOrderResponseDto,
	OrderResponseDto,
	OrdersListResponseDto,
	AvailableAiModelDto,
	HateoasAction,
	OrderStatus,
	type ApiResponse
} from '@api/shared';

type StatusColor = 'blue' | 'purple' | 'yellow' | 'green' | 'indigo' | 'red' | 'gray';

interface StatusConfig {
	label: string;
	color: StatusColor;
}

const STATUS_MAP: Record<OrderStatus, StatusConfig> = {
	[OrderStatus.CREATED]: { label: 'Draft', color: 'blue' },
	[OrderStatus.CALCULATED]: { label: 'Calculated', color: 'indigo' },
	[OrderStatus.PENDING_PAYMENT]: { label: 'Pending Payment', color: 'yellow' },
	[OrderStatus.PAID]: { label: 'Paid', color: 'green' },
	[OrderStatus.QUEUED]: { label: 'Queued', color: 'purple' },
	[OrderStatus.PROCESSING]: { label: 'Processing', color: 'purple' },
	[OrderStatus.COMPLETED]: { label: 'Completed', color: 'green' },
	[OrderStatus.FAILED]: { label: 'Failed', color: 'red' },
	[OrderStatus.PAYMENT_FAILED]: { label: 'Payment Failed', color: 'red' },
	[OrderStatus.CANCELLED]: { label: 'Cancelled', color: 'gray' },
	[OrderStatus.REFUNDED]: { label: 'Refunded', color: 'gray' }
};

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

	/**
	 * Get status configuration (color and label)
	 */
	getStatusConfig(status: OrderStatus): StatusConfig {
		return STATUS_MAP[status] || { label: status, color: 'gray' };
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
export { type StatusColor, type StatusConfig, ordersService };
