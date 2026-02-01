import { AvailableAiModelDto } from '../../ai-models/dto/available-ai-model.dto';
import { Order, OrderError } from '../entities/order.entity';
import { OrderStatus } from '../../../enums/order-status.enum';
import { Currency, CURRENCY_SYMBOLS } from '../../../enums/currency.enum';

/**
 * Public DTO for available models (excludes internal configuration)
 */
class OrderAvailableAiModelDto {
	id: string;
	category: string;
	currencySymbol: string;
	displayName: string;
	description: string;
	baseRate: number;
	pageLimit: number | false;
	price: number;
	totalPrice: number;
	available: boolean;
	unavailableReason: string | null;

	public static fromAvailableModel(model: AvailableAiModelDto): OrderAvailableAiModelDto {
		const dto = new OrderAvailableAiModelDto();
		dto.id = model.id;
		dto.category = model.category;
		dto.currencySymbol = CURRENCY_SYMBOLS[Currency.EUR];
		dto.category = model.category;
		dto.displayName = model.displayName;
		dto.description = model.description;
		dto.baseRate = model.baseRate;
		dto.pageLimit = model.pageLimit;
		dto.price = model.price;
		dto.totalPrice = model.totalPrice;
		dto.available = model.available;
		dto.unavailableReason = model.unavailableReason;
		return dto;
	}
}

class OrderResponseDto {
	id: number;
	userId: number | null;
	sessionId: string | null;
	hostname: string;
	modelId: string | null;
	priceTotal: number | null;
	priceCurrency: Currency | null;
	pricePerUrl: number | null;
	stripeSessionId: string | null;
	stripePaymentIntentSecret: string | null;
	status: OrderStatus;
	jobId: string | null;
	startedAt: Date | null;
	completedAt: Date | null;
	output: string | null;
	errors: OrderError[] | null;
	totalUrls: number | null;
	processedUrls: number;
	createdAt: Date;
	updatedAt: Date;
	availableModels: OrderAvailableAiModelDto[];

	public static fromEntity(entity: Order, availableModels: AvailableAiModelDto[] = []): OrderResponseDto {
		const dto = new OrderResponseDto();
		dto.id = entity.id;
		dto.userId = entity.userId;
		dto.sessionId = entity.sessionId;
		dto.hostname = entity.hostname;
		dto.modelId = entity.modelId;
		dto.priceTotal = entity.priceTotal;
		dto.priceCurrency = entity.priceCurrency;
		dto.pricePerUrl = entity.pricePerUrl;
		dto.stripeSessionId = entity.stripeSessionId;
		dto.stripePaymentIntentSecret = entity.stripePaymentIntentSecret;
		dto.status = entity.status;
		dto.jobId = entity.jobId;
		dto.startedAt = entity.startedAt;
		dto.completedAt = entity.completedAt;
		dto.output = entity.output;
		dto.errors = entity.errors;
		dto.totalUrls = entity.totalUrls;
		dto.processedUrls = entity.processedUrls;
		dto.createdAt = entity.createdAt;
		dto.updatedAt = entity.updatedAt;
		dto.availableModels = availableModels.map(m => OrderAvailableAiModelDto.fromAvailableModel(m));
		return dto;
	}
}

export { OrderResponseDto };
