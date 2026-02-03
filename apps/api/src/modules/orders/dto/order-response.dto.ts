import { AvailableAiModelDto } from '../../ai-models/dto/available-ai-model.dto';
import { Order, OrderError } from '../entities/order.entity';
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

/**
 * Public DTO for available models (excludes internal configuration)
 */
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

	public static create(model: AvailableAiModelDto): OrderAvailableAiModelDto {
		const dto = new OrderAvailableAiModelDto();
		dto.id = model.id;
		dto.available = model.available;
		dto.baseRate = model.baseRate;
		dto.category = model.category;
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
}

class CreateOrderResponseDto {
	id: number;
	userId: number | null;
	availableModels: OrderAvailableAiModelDto[];
	errors: OrderError[] | null;
	hostname: string;
	jobId: string | null;
	modelId: string | null;
	outputLength: number | null;
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

	public static create(entity: Order, availableModels: AvailableAiModelDto[]): CreateOrderResponseDto {
		const dto = new CreateOrderResponseDto();
		dto.id = entity.id;
		dto.userId = entity.userId;
		dto.availableModels = availableModels.map(m => OrderAvailableAiModelDto.create(m));
		dto.errors = entity.errors;
		dto.hostname = entity.hostname;
		dto.jobId = entity.jobId;
		dto.modelId = entity.modelId;
		dto.outputLength = entity.output?.length ?? 0;
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
}

class OrderResponseDto {
	id: number;
	userId: number | null;
	currency: string;
	currencySymbol: string;
	errors: OrderError[] | null;
	hostname: string;
	jobId: string | null;
	modelId: string | null;
	outputLength: number | null;
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
		dto.currency = entity.priceCurrency;
		dto.currencySymbol = CURRENCY_SYMBOLS[entity.priceCurrency];
		dto.errors = entity.errors;
		dto.hostname = entity.hostname;
		dto.jobId = entity.jobId;
		dto.modelId = entity.modelId;
		dto.outputLength = entity.output?.length ?? 0;
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
}

export { CreateOrderResponseDto, OrderResponseDto };
