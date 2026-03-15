import { ApiProperty } from '@nestjs/swagger';
import { AiModelConfig } from '@/modules/ai-models/entities/ai-model-config.entity';
import { Currency, CURRENCY_SYMBOLS } from '@/enums/currency.enum';

/**
 * DTO for available AI models with pricing and availability logic
 */
class AiModelResponseDto {
	@ApiProperty({
		description: 'Unique model identifier',
		example: 'gemini-2.5-flash-lite'
	})
	id: string;

	@ApiProperty({
		description: 'Model category',
		example: 'AI Content Generation'
	})
	category: string;

	@ApiProperty({
		description: 'Currency code',
		enum: Currency,
		example: Currency.EUR
	})
	currency: Currency;

	@ApiProperty({
		description: 'Currency symbol',
		example: '€'
	})
	currencySymbol: string;

	@ApiProperty({
		description: 'Human-readable model name',
		example: 'Gemini 2.5 Flash Lite'
	})
	displayName: string;

	@ApiProperty({
		description: 'Model description',
		example: 'Fast and efficient AI model for content generation'
	})
	description: string;

	@ApiProperty({
		description: 'Base rate per page',
		example: 0.001
	})
	baseRate: number;

	@ApiProperty({
		description: 'Maximum number of pages allowed (false for unlimited)',
		example: 100,
		oneOf: [{ type: 'number' }, { type: 'boolean', enum: [false] }]
	})
	pageLimit: number | false;

	@ApiProperty({
		description: 'Total calculated price for this order',
		example: 0
	})
	totalPrice: number;

	@ApiProperty({
		description: 'Whether the model is enabled in configuration',
		example: true
	})
	enabled: boolean;

	@ApiProperty({
		description: 'Whether the model is available for current order (enabled + within page limit)',
		example: true
	})
	available: boolean;

	@ApiProperty({
		description: 'Reason why model is unavailable (null if available)',
		example: null,
		nullable: true
	})
	unavailableReason: string | null;

	/**
	 * Create DTO from model config with calculated pricing (including Stripe minimum)
	 */
	public static fromModelConfig(config: AiModelConfig, totalUrls: number, calculatedTotalPrice: number): AiModelResponseDto {
		const dto = new AiModelResponseDto();
		dto.id = config.id;
		dto.displayName = config.displayName;
		dto.category = config.category;
		dto.description = config.description;
		dto.pageLimit = config.pageLimit;
		dto.baseRate = config.baseRate;
		dto.totalPrice = calculatedTotalPrice;
		dto.currency = config.currency;
		dto.currencySymbol = CURRENCY_SYMBOLS[config.currency];
		dto.enabled = config.enabled;
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
	public static fromJSONSingle(json: Record<string, unknown>): AiModelResponseDto {
		const dto = new AiModelResponseDto();
		dto.id = json.id as string;
		dto.category = json.category as string;
		dto.currency = json.currency as Currency;
		dto.currencySymbol = json.currencySymbol as string;
		dto.displayName = json.displayName as string;
		dto.description = json.description as string;
		dto.baseRate = json.baseRate as number;
		dto.pageLimit = json.pageLimit as number | false;
		dto.enabled = json.enabled as boolean;
		dto.totalPrice = json.totalPrice as number;
		dto.available = json.available as boolean;
		dto.unavailableReason = json.unavailableReason as string | null;
		return dto;
	}

	/**
	 * Deserialize array from JSON
	 */
	public static fromJSON(json: unknown): AiModelResponseDto[] {
		if (!Array.isArray(json)) {
			throw new Error('Expected array of AiModelResponseDto');
		}

		return json.map((item: Record<string, unknown>) => AiModelResponseDto.fromJSONSingle(item));
	}
}

export { AiModelResponseDto };
