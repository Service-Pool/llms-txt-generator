import { HttpClient } from './api.service';
import { configService } from '$lib/services/config.service';
import {
	CreateOrderRequestDto,
	CreateOrderResponseDto,
	OrderResponseDto,
	OrdersListResponseDto,
	AiModelResponseDto,
	LoadOrderOutputDto,
	HateoasAction,
	GenerationStrategy,
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
	async create(dto: CreateOrderRequestDto, options?: RequestInit): Promise<ApiResponse<CreateOrderResponseDto>> {
		return this.fetch(configService.endpoints.orders.base, CreateOrderResponseDto, {
			method: 'POST',
			body: JSON.stringify(dto),
			...options
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
	async getAvailableModels(id: number): Promise<ApiResponse<AiModelResponseDto[]>> {
		return this.fetch(configService.endpoints.orders.availableModels(id), AiModelResponseDto);
	}

	/**
	 * Calculate order with selected AI model
	 */
	async calculate(id: number, modelId: string, strategy: GenerationStrategy): Promise<ApiResponse<OrderResponseDto>> {
		return this.fetch(configService.endpoints.orders.calculate(id), OrderResponseDto, {
			method: 'POST',
			body: JSON.stringify({ modelId, strategy })
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
	 * Load full generated output content
	 * Returns file content and filename from API
	 */
	async load(id: number): Promise<ApiResponse<LoadOrderOutputDto>> {
		return this.fetch(configService.endpoints.orders.load(id), LoadOrderOutputDto);
	}

	/**
	 * Trigger ZIP download for order output.
	 * Prompts user for optional pathPrefix, then navigates browser to download endpoint.
	 * Returns false if user cancelled the prompt.
	 */
	downloadArchive(id: number): boolean {
		const pathPrefix = window.prompt(
			'Enter path prefix for .md file links (e.g. /docs), or leave empty for no prefix:',
			''
		);
		if (pathPrefix === null) return false;

		const a = document.createElement('a');
		a.href = configService.endpoints.orders.download(id, pathPrefix || null);
		a.setAttribute('data-sveltekit-reload', '');
		a.style.display = 'none';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		return true;
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
