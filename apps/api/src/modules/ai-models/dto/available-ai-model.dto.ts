import { ModelConfigDto } from './ai-model-config.dto';

class AvailableAiModelDto extends ModelConfigDto {
	public price: number;
	public totalPrice: number;
	public available: boolean;
	public unavailableReason: string | null;

	constructor(
		config: ModelConfigDto,
		totalUrls: number
	) {
		super(
			config.id,
			config.category,
			config.currency,
			config.displayName,
			config.description,
			config.serviceClass,
			config.modelName,
			config.baseRate,
			config.pageLimit,
			config.queueName,
			config.queueType,
			config.batchSize,
			config.options,
			config.enabled
		);

		this.price = config.baseRate;
		this.totalPrice = config.baseRate * totalUrls;
		this.available = config.enabled && (config.pageLimit === false || totalUrls <= config.pageLimit);
		this.unavailableReason = !config.enabled
			? 'Model is disabled'
			: config.pageLimit !== false && totalUrls > config.pageLimit
				? `Page limit exceeded (max ${config.pageLimit} pages)`
				: null;
	}

	public static fromModelConfig(config: ModelConfigDto, totalUrls: number): AvailableAiModelDto {
		return new AvailableAiModelDto(config, totalUrls);
	}
}

export { AvailableAiModelDto };
