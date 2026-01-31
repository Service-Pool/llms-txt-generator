import { Order, OrderError } from '../entities/order.entity';
import { OrderStatus } from '../../../enums/order-status.enum';
import { Currency } from '../../../enums/currency.enum';

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
	llmsEntriesCount: number | null;
	errors: OrderError[] | null;
	totalUrls: number | null;
	processedUrls: number;
	createdAt: Date;
	updatedAt: Date;

	static fromEntity(entity: Order): OrderResponseDto {
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
		dto.llmsEntriesCount = entity.llmsEntriesCount;
		dto.errors = entity.errors;
		dto.totalUrls = entity.totalUrls;
		dto.processedUrls = entity.processedUrls;
		dto.createdAt = entity.createdAt;
		dto.updatedAt = entity.updatedAt;
		return dto;
	}
}

export { OrderResponseDto };
