import { AiModelConfig } from '../entities/ai-model-config.entity';
import { Currency, CURRENCY_SYMBOLS } from '../../../enums/currency.enum';

/**
 * DTO for available AI models with pricing and availability logic
 */
class AvailableAiModelDto {
	id: string;
	category: string;
	currency: Currency;
	currencySymbol: string;
	displayName: string;
	description: string;
	baseRate: number;
	pageLimit: number | false;
	totalPrice: number;
	available: boolean;
	unavailableReason: string | null;

	/**
	 * Create DTO from model config with calculated pricing (including Stripe minimum)
	 */
	public static fromModelConfig(config: AiModelConfig, totalUrls: number, calculatedTotalPrice: number): AvailableAiModelDto {
		const dto = new AvailableAiModelDto();
		dto.id = config.id;
		dto.displayName = config.displayName;
		dto.category = config.category;
		dto.description = config.description;
		dto.pageLimit = config.pageLimit;
		dto.baseRate = config.baseRate;
		dto.totalPrice = calculatedTotalPrice;
		dto.currency = config.currency;
		dto.currencySymbol = CURRENCY_SYMBOLS[config.currency];
		dto.available = config.enabled && (config.pageLimit === false || totalUrls <= config.pageLimit);
		dto.unavailableReason = !config.enabled
			? 'Model is disabled'
			: config.pageLimit !== false && totalUrls > config.pageLimit
				? `Page limit exceeded (max ${config.pageLimit} pages)`
				: null;

		return dto;
	}

	/**
	 * Deserialize single object from JSON
	 */
	public static fromJSONSingle(json: Record<string, unknown>): AvailableAiModelDto {
		const dto = new AvailableAiModelDto();
		dto.id = json.id as string;
		dto.category = json.category as string;
		dto.currency = json.currency as Currency;
		dto.currencySymbol = json.currencySymbol as string;
		dto.displayName = json.displayName as string;
		dto.description = json.description as string;
		dto.baseRate = json.baseRate as number;
		dto.pageLimit = json.pageLimit as number | false;
		dto.totalPrice = json.totalPrice as number;
		dto.available = json.available as boolean;
		dto.unavailableReason = json.unavailableReason as string | null;
		return dto;
	}

	/**
	 * Deserialize array from JSON
	 */
	public static fromJSON(json: unknown): AvailableAiModelDto[] {
		if (!Array.isArray(json)) {
			throw new Error('Expected array of AvailableAiModelDto');
		}

		return json.map((item: Record<string, unknown>) => AvailableAiModelDto.fromJSONSingle(item));
	}
}

export { AvailableAiModelDto };
