import { AvailableAiModelDto } from '../../ai-models/dto/available-ai-model.dto';
import { Order, OrderError } from '../entities/order.entity';
import { OrderStatus } from '../../../enums/order-status.enum';
import { CURRENCY_SYMBOLS } from '../../../enums/currency.enum';

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

	public static fromAvailableModel(model: AvailableAiModelDto): OrderAvailableAiModelDto {
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

	public static fromEntity(entity: Order, availableModels: AvailableAiModelDto[]): CreateOrderResponseDto {
		const dto = new CreateOrderResponseDto();
		dto.id = entity.id;
		dto.userId = entity.userId;
		dto.availableModels = availableModels.map(m => OrderAvailableAiModelDto.fromAvailableModel(m));
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

	public static fromEntity(entity: Order): OrderResponseDto {
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

		return dto;
	}
}

export { CreateOrderResponseDto, OrderResponseDto };
