import { ModelConfigDto } from './model-config.dto';

class AvailableModelDto extends ModelConfigDto {
	public price: string;
	public totalPrice: string;
	public available: boolean;
	public unavailableReason: string | null;

	constructor(
		config: ModelConfigDto,
		totalUrls: number,
		currencySymbol: string
	) {
		super(
			config.id,
			config.category,
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

		const totalPrice = config.baseRate * totalUrls;
		this.price = `${currencySymbol}${config.baseRate.toFixed(4)}`;
		this.totalPrice = `${currencySymbol}${totalPrice.toFixed(2)}`;
		this.available = config.enabled && (config.pageLimit === false || totalUrls <= config.pageLimit);
		this.unavailableReason = !config.enabled
			? 'Model is disabled'
			: config.pageLimit !== false && totalUrls > config.pageLimit
				? `Page limit exceeded (max ${config.pageLimit} pages)`
				: null;
	}

	static fromModelConfig(config: ModelConfigDto, totalUrls: number, currencySymbol: string): AvailableModelDto {
		return new AvailableModelDto(config, totalUrls, currencySymbol);
	}
}

export { AvailableModelDto };
