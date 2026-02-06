import { AvailableAiModelDto } from '../../ai-models/dto/available-ai-model.dto';
import { AiModelConfig } from '../../ai-models/entities/ai-model-config.entity';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '../../../enums/order-status.enum';
import { CURRENCY_SYMBOLS } from '../../../enums/currency.enum';

/**
 * HATEOAS link interface
 */
interface HateoasLink {
	href: string;
	method?: string;
	description?: string;
}

/**
 * Build HATEOAS links based on order status
 */
function buildOrderLinks(entity: Order): Record<string, HateoasLink> {
	const links: Record<string, HateoasLink> = {
		self: {
			href: `/api/orders/${entity.id}`,
			method: 'GET'
		}
	};

	switch (entity.status) {
		case OrderStatus.CREATED:
			links.calculate = {
				href: `/api/orders/${entity.id}/calculate`,
				method: 'POST',
				description: 'Calculate order price and select model'
			};
			break;

		case OrderStatus.CALCULATED:
			if (entity.priceTotal === 0) {
				// Free model
				links.run = {
					href: `/api/orders/${entity.id}/run`,
					method: 'POST',
					description: 'Start order processing'
				};
			} else {
				// Paid model
				links.checkout = {
					href: `/api/orders/${entity.id}/payment/checkout`,
					method: 'POST',
					description: 'Create Stripe checkout session'
				};
				links.paymentIntent = {
					href: `/api/orders/${entity.id}/payment/intent`,
					method: 'POST',
					description: 'Create Stripe payment intent'
				};
			}
			break;

		case OrderStatus.PENDING_PAYMENT:
			links.run = {
				href: `/api/orders/${entity.id}/run`,
				method: 'POST',
				description: 'Check payment and start processing'
			};
			links.checkout = {
				href: `/api/orders/${entity.id}/payment/checkout`,
				method: 'POST',
				description: 'Get or create checkout session'
			};
			links.paymentIntent = {
				href: `/api/orders/${entity.id}/payment/intent`,
				method: 'POST',
				description: 'Get or create payment intent'
			};
			break;

		case OrderStatus.PAID:
			links.run = {
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
				links.download = {
					href: `/api/orders/${entity.id}/output`,
					method: 'GET',
					description: 'Download generated llms.txt'
				};
			}
			break;

		case OrderStatus.FAILED:
			if (entity.stripePaymentIntentSecret) {
				links.refund = {
					href: `/api/orders/${entity.id}/payment/refund`,
					method: 'POST',
					description: 'Request refund'
				};
			}
			break;

		case OrderStatus.PAYMENT_FAILED:
			links.checkout = {
				href: `/api/orders/${entity.id}/payment/checkout`,
				method: 'POST',
				description: 'Retry payment with checkout'
			};
			links.paymentIntent = {
				href: `/api/orders/${entity.id}/payment/intent`,
				method: 'POST',
				description: 'Retry payment with payment intent'
			};
			break;
	}

	return links;
}

class OrderAvailableAiModelDto {
	id: string;
	available: boolean;
	baseRate: number;
	category: string;
	currency: string;
	currencySymbol: string;
	description: string;
	displayName: string;
	pageLimit: number | false;
	price: number;
	totalPrice: number;
	unavailableReason: string | null;

	public static createFromAvailableModels(model: AvailableAiModelDto): OrderAvailableAiModelDto {
		const dto = new OrderAvailableAiModelDto();
		dto.id = model.id;
		dto.available = model.available;
		dto.baseRate = model.baseRate;
		dto.category = model.category;
		dto.currency = model.currency;
		dto.currencySymbol = CURRENCY_SYMBOLS[model.currency];
		dto.description = model.description;
		dto.displayName = model.displayName;
		dto.pageLimit = model.pageLimit;
		dto.price = model.price;
		dto.totalPrice = model.totalPrice;
		dto.unavailableReason = model.unavailableReason;

		return dto;
	}

	public static createFromModelConfig(modelConfig: AiModelConfig, totalUrls: number): OrderAvailableAiModelDto {
		const dto = new OrderAvailableAiModelDto();
		dto.id = modelConfig.id;
		dto.available = true;
		dto.baseRate = modelConfig.baseRate;
		dto.category = modelConfig.category;
		dto.description = modelConfig.description;
		dto.displayName = modelConfig.displayName;
		dto.pageLimit = modelConfig.pageLimit;
		dto.price = modelConfig.baseRate;
		dto.totalPrice = modelConfig.baseRate * totalUrls;
		dto.unavailableReason = null;

		return dto;
	}

	public static fromJSON(json: Record<string, unknown>): OrderAvailableAiModelDto {
		const dto = new OrderAvailableAiModelDto();
		dto.id = json.id as string;
		dto.available = json.available as boolean;
		dto.baseRate = json.baseRate as number;
		dto.category = json.category as string;
		dto.currency = json.currency as string;
		dto.currencySymbol = json.currencySymbol as string;
		dto.description = json.description as string;
		dto.displayName = json.displayName as string;
		dto.pageLimit = json.pageLimit as number | false;
		dto.price = json.price as number;
		dto.totalPrice = json.totalPrice as number;
		dto.unavailableReason = json.unavailableReason as string | null;

		return dto;
	}
}

class CreateOrderResponseDto {
	id: number;
	userId: number | null;
	availableAiModels: OrderAvailableAiModelDto[];
	errors: string[] | null;
	hostname: string;
	jobId: string | null;
	modelId: string | null;
	output: string | null;
	pricePerUrl: number | null;
	priceTotal: number | null;
	processedUrls: number;
	startedAt: Date | null;
	status: OrderStatus;
	stripePaymentIntentSecret: string | null;
	stripeSessionId: string | null;
	totalUrls: number | null;
	completedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
	_links: Record<string, HateoasLink>;

	public static create(entity: Order, availableAiModels: AvailableAiModelDto[]): CreateOrderResponseDto {
		const dto = new CreateOrderResponseDto();
		dto.id = entity.id;
		dto.userId = entity.userId;
		dto.availableAiModels = availableAiModels.map(m => OrderAvailableAiModelDto.createFromAvailableModels(m));
		dto.errors = entity.errors;
		dto.hostname = entity.hostname;
		dto.jobId = entity.jobId;
		dto.modelId = entity.modelId;
		dto.output = entity.output;
		dto.pricePerUrl = entity.pricePerUrl;
		dto.priceTotal = entity.priceTotal;
		dto.processedUrls = entity.processedUrls;
		dto.startedAt = entity.startedAt;
		dto.status = entity.status;
		dto.stripePaymentIntentSecret = entity.stripePaymentIntentSecret;
		dto.stripeSessionId = entity.stripeSessionId;
		dto.totalUrls = entity.totalUrls;
		dto.completedAt = entity.completedAt;
		dto.createdAt = entity.createdAt;
		dto.updatedAt = entity.updatedAt;
		dto._links = buildOrderLinks(entity);

		return dto;
	}

	public static fromJSON(json: Record<string, unknown>): CreateOrderResponseDto {
		const dto = new CreateOrderResponseDto();
		dto.id = json.id as number;
		dto.userId = json.userId as number | null;
		dto.availableAiModels = (json.availableAiModels as Record<string, unknown>[]).map(m =>
			OrderAvailableAiModelDto.fromJSON(m));
		dto.errors = json.errors as string[] | null;
		dto.hostname = json.hostname as string;
		dto.jobId = json.jobId as string | null;
		dto.modelId = json.modelId as string | null;
		dto.output = json.output as string | null;
		dto.pricePerUrl = json.pricePerUrl as number | null;
		dto.priceTotal = json.priceTotal as number | null;
		dto.processedUrls = json.processedUrls as number;
		dto.startedAt = json.startedAt ? new Date(json.startedAt as string) : null;
		dto.status = json.status as OrderStatus;
		dto.stripePaymentIntentSecret = json.stripePaymentIntentSecret as string | null;
		dto.stripeSessionId = json.stripeSessionId as string | null;
		dto.totalUrls = json.totalUrls as number | null;
		dto.completedAt = json.completedAt ? new Date(json.completedAt as string) : null;
		dto.createdAt = new Date(json.createdAt as string);
		dto.updatedAt = new Date(json.updatedAt as string);
		dto._links = json._links as Record<string, HateoasLink>;

		return dto;
	}
}

class OrderResponseDto {
	id: number;
	userId: number | null;
	currentAiModel: OrderAvailableAiModelDto | null;
	currency: string;
	currencySymbol: string;
	errors: string[] | null;
	hostname: string;
	jobId: string | null;
	output: string | null;
	pricePerUrl: number | null;
	priceTotal: number | null;
	processedUrls: number;
	startedAt: Date | null;
	status: OrderStatus;
	stripePaymentIntentSecret: string | null;
	stripeSessionId: string | null;
	totalUrls: number | null;
	completedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
	_links: Record<string, HateoasLink>;

	public static create(entity: Order): OrderResponseDto {
		const dto = new OrderResponseDto();
		dto.id = entity.id;
		dto.userId = entity.userId;
		dto.currentAiModel = entity.aiModelConfig
			? OrderAvailableAiModelDto.createFromModelConfig(entity.aiModelConfig, entity.totalUrls || 0)
			: null;
		dto.currency = entity.priceCurrency;
		dto.currencySymbol = CURRENCY_SYMBOLS[entity.priceCurrency];
		dto.errors = entity.errors;
		dto.hostname = entity.hostname;
		dto.jobId = entity.jobId;
		dto.output = entity.output;
		dto.pricePerUrl = entity.pricePerUrl;
		dto.priceTotal = entity.priceTotal;
		dto.processedUrls = entity.processedUrls;
		dto.startedAt = entity.startedAt;
		dto.status = entity.status;
		dto.stripePaymentIntentSecret = entity.stripePaymentIntentSecret;
		dto.stripeSessionId = entity.stripeSessionId;
		dto.totalUrls = entity.totalUrls;
		dto.completedAt = entity.completedAt;
		dto.createdAt = entity.createdAt;
		dto.updatedAt = entity.updatedAt;
		dto._links = buildOrderLinks(entity);

		return dto;
	}

	public static fromJSON(json: Record<string, unknown>): OrderResponseDto {
		const dto = new OrderResponseDto();
		dto.id = json.id as number;
		dto.userId = json.userId as number | null;
		dto.currentAiModel = json.currentAiModel
			? OrderAvailableAiModelDto.fromJSON(json.currentAiModel as Record<string, unknown>)
			: null;
		dto.currency = json.currency as string;
		dto.currencySymbol = json.currencySymbol as string;
		dto.errors = json.errors as string[] | null;
		dto.hostname = json.hostname as string;
		dto.jobId = json.jobId as string | null;
		dto.output = json.output as string | null;
		dto.pricePerUrl = json.pricePerUrl as number | null;
		dto.priceTotal = json.priceTotal as number | null;
		dto.processedUrls = json.processedUrls as number;
		dto.startedAt = json.startedAt ? new Date(json.startedAt as string) : null;
		dto.status = json.status as OrderStatus;
		dto.stripePaymentIntentSecret = json.stripePaymentIntentSecret as string | null;
		dto.stripeSessionId = json.stripeSessionId as string | null;
		dto.totalUrls = json.totalUrls as number | null;
		dto.completedAt = json.completedAt ? new Date(json.completedAt as string) : null;
		dto.createdAt = new Date(json.createdAt as string);
		dto.updatedAt = new Date(json.updatedAt as string);
		dto._links = json._links as Record<string, HateoasLink>;

		return dto;
	}
}

class OrdersListResponseDto {
	items: OrderResponseDto[];
	total: number;
	page: number;
	limit: number;

	public static create(orders: Order[], total: number, page: number, limit: number): OrdersListResponseDto {
		const dto = new OrdersListResponseDto();
		dto.items = orders.map(order => OrderResponseDto.create(order));
		dto.total = total;
		dto.page = page;
		dto.limit = limit;
		return dto;
	}

	public static fromJSON(json: Record<string, unknown>): OrdersListResponseDto {
		const dto = new OrdersListResponseDto();
		dto.items = (json.items as Record<string, unknown>[]).map(item =>
			OrderResponseDto.fromJSON(item));

		dto.total = json.total as number;
		dto.page = json.page as number;
		dto.limit = json.limit as number;
		return dto;
	}
}

export { CreateOrderResponseDto, OrderResponseDto, OrdersListResponseDto };
