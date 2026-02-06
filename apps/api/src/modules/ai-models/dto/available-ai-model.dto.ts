import { AiModelConfig } from '../entities/ai-model-config.entity';
import { Currency } from '../../../enums/currency.enum';

/**
 * DTO for available AI models with pricing and availability logic
 */
class AvailableAiModelDto {
	id: string;
	category: string;
	currency: Currency;
	displayName: string;
	description: string;
	baseRate: number;
	pageLimit: number | false;
	price: number;
	totalPrice: number;
	available: boolean;
	unavailableReason: string | null;

	public static fromModelConfig(config: AiModelConfig, totalUrls: number): AvailableAiModelDto {
		const dto = new AvailableAiModelDto();
		dto.id = config.id;
		dto.category = config.category;
		dto.currency = config.currency;
		dto.displayName = config.displayName;
		dto.description = config.description;
		dto.baseRate = config.baseRate;
		dto.pageLimit = config.pageLimit;
		dto.price = config.baseRate;
		dto.totalPrice = config.baseRate * totalUrls;
		dto.available = config.enabled && (config.pageLimit === false || totalUrls <= config.pageLimit);
		dto.unavailableReason = !config.enabled
			? 'Model is disabled'
			: config.pageLimit !== false && totalUrls > config.pageLimit
				? `Page limit exceeded (max ${config.pageLimit} pages)`
				: null;

		return dto;
	}
}

export { AvailableAiModelDto };
