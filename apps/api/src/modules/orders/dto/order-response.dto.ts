import { ApiProperty } from '@nestjs/swagger';
import { AvailableAiModelDto } from '../../ai-models/dto/available-ai-model.dto';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '../../../enums/order-status.enum';
import { CURRENCY_SYMBOLS } from '../../../enums/currency.enum';
import { HateoasAction } from '../../../enums/hateoas-action.enum';
import { OrderStatusMachine } from '../utils/order-status-machine';

/**
 * HATEOAS link interface
 */
interface HateoasLink {
	href: string;
	method?: string;
	description?: string;
}

/**
 * Truncate text to specified number of words
 */
function truncateToWords(text: string | null, maxWords: number): string | null {
	if (!text) {
		return text;
	}

	const wordMatches = [...text.matchAll(/\S+/g)];

	if (wordMatches.length <= maxWords) {
		return text;
	}

	const lastWordMatch = wordMatches[maxWords - 1];
	const truncatePosition = lastWordMatch.index + lastWordMatch[0].length;

	return `${text.substring(0, truncatePosition)}...`;
}

/**
 * Build HATEOAS links based on order status
 */
function buildOrderLinks(entity: Order): Record<string, HateoasLink> {
	const links: Record<string, HateoasLink> = {
		[HateoasAction.SELF]: {
			href: `/api/orders/${entity.id}`,
			method: 'GET'
		}
	};

	switch (entity.status) {
		case OrderStatus.CREATED:
			links[HateoasAction.CALCULATE] = {
				href: `/api/orders/${entity.id}/calculate`,
				method: 'POST',
				description: 'Calculate order price and select model'
			};
			break;

		case OrderStatus.CALCULATED:
			// Allow model change before payment/execution
			links[HateoasAction.CALCULATE] = {
				href: `/api/orders/${entity.id}/calculate`,
				method: 'POST',
				description: 'Change AI model and recalculate price'
			};

			if (entity.priceTotal === 0) {
				// Free model
				links[HateoasAction.RUN] = {
					href: `/api/orders/${entity.id}/run`,
					method: 'POST',
					description: 'Start order processing'
				};
			} else {
				// Paid model
				links[HateoasAction.CHECKOUT] = {
					href: `/api/orders/${entity.id}/payment/checkout`,
					method: 'POST',
					description: 'Create Stripe checkout session'
				};
				links[HateoasAction.PAYMENT_INTENT] = {
					href: `/api/orders/${entity.id}/payment/intent`,
					method: 'POST',
					description: 'Create Stripe payment intent'
				};
			}
			break;

		case OrderStatus.PENDING_PAYMENT:
			links[HateoasAction.RUN] = {
				href: `/api/orders/${entity.id}/run`,
				method: 'POST',
				description: 'Check payment and start processing'
			};
			links[HateoasAction.CHECKOUT] = {
				href: `/api/orders/${entity.id}/payment/checkout`,
				method: 'POST',
				description: 'Get or create checkout session'
			};
			links[HateoasAction.PAYMENT_INTENT] = {
				href: `/api/orders/${entity.id}/payment/intent`,
				method: 'POST',
				description: 'Get or create payment intent'
			};
			break;

		case OrderStatus.PAID:
			links[HateoasAction.RUN] = {
				href: `/api/orders/${entity.id}/run`,
				method: 'POST',
				description: 'Start order processing'
			};
			break;

		case OrderStatus.QUEUED:
		case OrderStatus.PROCESSING:
			// Only self link - wait for processing
			break;

		case OrderStatus.COMPLETED:
			if (entity.output) {
				links[HateoasAction.DOWNLOAD] = {
					href: `/api/orders/${entity.id}/output`,
					method: 'GET',
					description: 'Download generated llms.txt'
				};
			}
			break;

		case OrderStatus.FAILED:
			if (entity.stripePaymentIntentSecret) {
				links[HateoasAction.REFUND] = {
					href: `/api/orders/${entity.id}/payment/refund`,
					method: 'POST',
					description: 'Request refund'
				};
			}
			break;

		case OrderStatus.PAYMENT_FAILED:
			links[HateoasAction.CHECKOUT] = {
				href: `/api/orders/${entity.id}/payment/checkout`,
				method: 'POST',
				description: 'Retry payment with checkout'
			};
			links[HateoasAction.PAYMENT_INTENT] = {
				href: `/api/orders/${entity.id}/payment/intent`,
				method: 'POST',
				description: 'Retry payment with payment intent'
			};
			break;
	}

	// Add delete link for orders that can be deleted according to state machine
	if (OrderStatusMachine.canBeDeleted(entity.status)) {
		links[HateoasAction.DELETE] = {
			href: `/api/orders/${entity.id}`,
			method: 'DELETE',
			description: 'Delete this order'
		};
	}

	return links;
}

/**
 * Attributes for CreateOrderResponseDto
 */
class CreateOrderAttributes {
	@ApiProperty({ description: 'Order ID', example: 123 })
	id: number;

	@ApiProperty({
		description: 'Available AI models for this order',
		type: [AvailableAiModelDto],
		isArray: true
	})
	availableAiModels: AvailableAiModelDto[];

	@ApiProperty({ description: 'Website hostname', example: 'example.com' })
	hostname: string;

	@ApiProperty({
		description: 'Selected AI model ID',
		example: 'gpt-4'
	})
	modelId: string | null;

	@ApiProperty({
		description: 'Order status',
		enum: OrderStatus,
		example: OrderStatus.CREATED
	})
	status: OrderStatus;

	@ApiProperty({
		description: 'Total number of URLs to process',
		example: 150
	})
	totalUrls: number | null;

	@ApiProperty({ description: 'Order creation date' })
	createdAt: Date;

	@ApiProperty({ description: 'Order last update date' })
	updatedAt: Date;

	public static create(entity: Order, availableAiModels: AvailableAiModelDto[]): CreateOrderAttributes {
		const attrs = new CreateOrderAttributes();
		attrs.id = entity.id;
		attrs.availableAiModels = availableAiModels;
		attrs.hostname = entity.hostname;
		attrs.modelId = entity.modelId;
		attrs.status = entity.status;
		attrs.totalUrls = entity.totalUrls;
		attrs.createdAt = entity.createdAt;
		attrs.updatedAt = entity.updatedAt;
		return attrs;
	}

	public static fromJSON(json: Record<string, unknown>): CreateOrderAttributes {
		const attrs = new CreateOrderAttributes();
		attrs.id = json.id as number;
		attrs.availableAiModels = AvailableAiModelDto.fromJSON(json.availableAiModels);
		attrs.hostname = json.hostname as string;
		attrs.modelId = json.modelId as string | null;
		attrs.status = json.status as OrderStatus;
		attrs.totalUrls = json.totalUrls as number | null;
		attrs.createdAt = new Date(json.createdAt as string);
		attrs.updatedAt = new Date(json.updatedAt as string);
		return attrs;
	}
}

class CreateOrderResponseDto {
	@ApiProperty({
		description: 'Order attributes',
		type: CreateOrderAttributes
	})
	attributes: CreateOrderAttributes;

	@ApiProperty({
		description: 'HATEOAS navigation links',
		example: {
			self: { href: '/api/orders/123', method: 'GET' },
			calculate: { href: '/api/orders/123/calculate', method: 'POST' }
		}
	})
	_links: Partial<Record<HateoasAction, HateoasLink>>;

	public static create(entity: Order, availableAiModels: AvailableAiModelDto[]): CreateOrderResponseDto {
		const dto = new CreateOrderResponseDto();
		dto.attributes = CreateOrderAttributes.create(entity, availableAiModels);
		dto._links = buildOrderLinks(entity);
		return dto;
	}

	public static fromJSON(json: Record<string, unknown>): CreateOrderResponseDto {
		const dto = new CreateOrderResponseDto();
		dto.attributes = CreateOrderAttributes.fromJSON(json.attributes as Record<string, unknown>);
		dto._links = json._links as Record<string, HateoasLink>;
		return dto;
	}
}

/**
 * Attributes for OrderResponseDto
 */
class OrderAttributes {
	@ApiProperty({ description: 'Order ID', example: 123 })
	id: number;

	@ApiProperty({
		description: 'Currently selected AI model with pricing details',
		type: AvailableAiModelDto
	})
	currentAiModel: AvailableAiModelDto | null;

	@ApiProperty({ description: 'Currency code', example: 'USD' })
	currency: string;

	@ApiProperty({ description: 'Currency symbol', example: '$' })
	currencySymbol: string;

	@ApiProperty({
		description: 'Processing errors if any',
		type: [String],
		isArray: true,
		example: null
	})
	errors: string[] | null;

	@ApiProperty({
		description: 'Website hostname',
		example: 'example.com'
	})
	hostname: string;

	@ApiProperty({
		description: 'Generated llms.txt content (truncated to 300 words)',
		example: 'Generated content for example.com...'
	})
	output: string | null;

	@ApiProperty({
		description: 'Price per URL in selected currency',
		example: 0.01
	})
	pricePerUrl: number | null;

	@ApiProperty({
		description: 'Total order price in selected currency',
		example: 1.50
	})
	priceTotal: number | null;

	@ApiProperty({
		description: 'Number of URLs processed',
		example: 125
	})
	processedUrls: number;

	@ApiProperty({ description: 'Order processing start date' })
	startedAt: Date | null;

	@ApiProperty({
		description: 'Order status',
		enum: OrderStatus,
		example: OrderStatus.COMPLETED
	})
	status: OrderStatus;

	@ApiProperty({
		description: 'Stripe payment intent client secret for payment processing'
	})
	stripePaymentIntentSecret: string | null;

	@ApiProperty({
		description: 'Stripe checkout session ID'
	})
	stripeSessionId: string | null;

	@ApiProperty({
		description: 'Total number of URLs to process',
		example: 150
	})
	totalUrls: number | null;

	@ApiProperty({ description: 'Order completion date' })
	completedAt: Date | null;

	@ApiProperty({ description: 'Order creation date' })
	createdAt: Date;

	@ApiProperty({ description: 'Order last update date' })
	updatedAt: Date;

	public static create(entity: Order): OrderAttributes {
		const attrs = new OrderAttributes();
		attrs.id = entity.id;
		attrs.currentAiModel = null;
		attrs.currency = entity.priceCurrency;
		attrs.currencySymbol = CURRENCY_SYMBOLS[entity.priceCurrency];
		attrs.errors = entity.errors;
		attrs.hostname = entity.hostname;
		attrs.output = truncateToWords(entity.output, 300);
		attrs.pricePerUrl = entity.pricePerUrl;
		attrs.priceTotal = entity.priceTotal;
		attrs.processedUrls = entity.processedUrls;
		attrs.startedAt = entity.startedAt;
		attrs.status = entity.status;
		attrs.stripePaymentIntentSecret = entity.stripePaymentIntentSecret;
		attrs.stripeSessionId = entity.stripeSessionId;
		attrs.totalUrls = entity.totalUrls;
		attrs.completedAt = entity.completedAt;
		attrs.createdAt = entity.createdAt;
		attrs.updatedAt = entity.updatedAt;

		// Build currentAiModel from entity data
		if (entity.modelId && entity.aiModelConfig) {
			const aiModelDto = new AvailableAiModelDto();
			aiModelDto.id = entity.aiModelConfig.id;
			aiModelDto.available = true;
			aiModelDto.baseRate = entity.aiModelConfig.baseRate;
			aiModelDto.category = entity.aiModelConfig.category;
			aiModelDto.currency = entity.priceCurrency;
			aiModelDto.currencySymbol = CURRENCY_SYMBOLS[entity.priceCurrency];
			aiModelDto.description = entity.aiModelConfig.description;
			aiModelDto.displayName = entity.aiModelConfig.displayName;
			aiModelDto.pageLimit = entity.aiModelConfig.pageLimit;
			aiModelDto.totalPrice = entity.priceTotal;
			aiModelDto.unavailableReason = null;
			attrs.currentAiModel = aiModelDto;
		}

		return attrs;
	}

	public static fromJSON(json: Record<string, unknown>): OrderAttributes {
		const attrs = new OrderAttributes();
		attrs.id = json.id as number;
		attrs.currentAiModel = json.currentAiModel
			? AvailableAiModelDto.fromJSONSingle(json.currentAiModel as Record<string, unknown>)
			: null;
		attrs.currency = json.currency as string;
		attrs.currencySymbol = json.currencySymbol as string;
		attrs.errors = json.errors as string[] | null;
		attrs.hostname = json.hostname as string;
		attrs.output = json.output as string | null;
		attrs.pricePerUrl = json.pricePerUrl as number | null;
		attrs.priceTotal = json.priceTotal as number | null;
		attrs.processedUrls = json.processedUrls as number;
		attrs.startedAt = json.startedAt ? new Date(json.startedAt as string) : null;
		attrs.status = json.status as OrderStatus;
		attrs.stripePaymentIntentSecret = json.stripePaymentIntentSecret as string | null;
		attrs.stripeSessionId = json.stripeSessionId as string | null;
		attrs.totalUrls = json.totalUrls as number | null;
		attrs.completedAt = json.completedAt ? new Date(json.completedAt as string) : null;
		attrs.createdAt = new Date(json.createdAt as string);
		attrs.updatedAt = new Date(json.updatedAt as string);
		return attrs;
	}
}

class OrderResponseDto {
	@ApiProperty({
		description: 'Order attributes',
		type: OrderAttributes
	})
	attributes: OrderAttributes;

	@ApiProperty({
		description: 'HATEOAS navigation links based on order status',
		example: {
			self: { href: '/api/orders/123', method: 'GET' },
			download: { href: '/api/orders/123/output', method: 'GET' }
		}
	})
	_links: Partial<Record<HateoasAction, HateoasLink>>;

	public static create(entity: Order): OrderResponseDto {
		const dto = new OrderResponseDto();
		dto.attributes = OrderAttributes.create(entity);
		dto._links = buildOrderLinks(entity);
		return dto;
	}

	public static fromJSON(json: Record<string, unknown>): OrderResponseDto {
		const dto = new OrderResponseDto();
		dto.attributes = OrderAttributes.fromJSON(json.attributes as Record<string, unknown>);
		dto._links = json._links as Record<string, HateoasLink>;
		return dto;
	}
}

/**
 * Attributes for DownloadOrderResponseDto
 */
class DownloadOrderAttributes {
	@ApiProperty({
		description: 'Downloaded file name',
		example: 'llms-example.com.txt'
	})
	filename: string;

	@ApiProperty({
		description: 'File content',
		example: 'Generated llms.txt content...'
	})
	content: string;

	public static create(filename: string, content: string): DownloadOrderAttributes {
		const attrs = new DownloadOrderAttributes();
		attrs.filename = filename;
		attrs.content = content;
		return attrs;
	}

	public static fromJSON(json: Record<string, unknown>): DownloadOrderAttributes {
		const attrs = new DownloadOrderAttributes();
		attrs.filename = json.filename as string;
		attrs.content = json.content as string;
		return attrs;
	}
}

class DownloadOrderResponseDto {
	@ApiProperty({
		description: 'Download attributes',
		type: DownloadOrderAttributes
	})
	attributes: DownloadOrderAttributes;

	public static create(filename: string, content: string): DownloadOrderResponseDto {
		const dto = new DownloadOrderResponseDto();
		dto.attributes = DownloadOrderAttributes.create(filename, content);
		return dto;
	}

	public static fromJSON(json: Record<string, unknown>): DownloadOrderResponseDto {
		const dto = new DownloadOrderResponseDto();
		dto.attributes = DownloadOrderAttributes.fromJSON(json.attributes as Record<string, unknown>);
		return dto;
	}
}

/**
 * Attributes for OrdersListResponseDto
 */
class OrdersListAttributes {
	@ApiProperty({
		description: 'List of orders',
		type: [OrderResponseDto],
		isArray: true
	})
	items: OrderResponseDto[];

	@ApiProperty({
		description: 'Total number of orders',
		example: 25
	})
	total: number;

	@ApiProperty({
		description: 'Current page number',
		example: 1
	})
	page: number;

	@ApiProperty({
		description: 'Number of items per page',
		example: 5
	})
	limit: number;

	public static create(orders: Order[], total: number, page: number, limit: number): OrdersListAttributes {
		const attrs = new OrdersListAttributes();
		attrs.items = orders.map(order => OrderResponseDto.create(order));
		attrs.total = total;
		attrs.page = page;
		attrs.limit = limit;
		return attrs;
	}

	public static fromJSON(json: Record<string, unknown>): OrdersListAttributes {
		const attrs = new OrdersListAttributes();
		attrs.items = (json.items as Record<string, unknown>[]).map(item =>
			OrderResponseDto.fromJSON(item));
		attrs.total = json.total as number;
		attrs.page = json.page as number;
		attrs.limit = json.limit as number;
		return attrs;
	}
}

class OrdersListResponseDto {
	@ApiProperty({
		description: 'List attributes',
		type: OrdersListAttributes
	})
	attributes: OrdersListAttributes;

	public static create(orders: Order[], total: number, page: number, limit: number): OrdersListResponseDto {
		const dto = new OrdersListResponseDto();
		dto.attributes = OrdersListAttributes.create(orders, total, page, limit);
		return dto;
	}

	public static fromJSON(json: Record<string, unknown>): OrdersListResponseDto {
		const dto = new OrdersListResponseDto();
		dto.attributes = OrdersListAttributes.fromJSON(json.attributes as Record<string, unknown>);
		return dto;
	}
}

export { CreateOrderResponseDto, OrderResponseDto, OrdersListResponseDto, DownloadOrderResponseDto };
