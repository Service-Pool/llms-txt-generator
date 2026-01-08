import { Calculation } from '../entities/calculation.entity';
import { Provider } from '../../../enums/provider.enum';
import { Currency } from '../../../enums/currency.enum';

class CalculationPriceDtoResponse {
	public provider: Provider;
	public total: number;
	public perUrl: number;
	public currency: Currency;
	public currencySymbol: string;

	public static fromModel(
		provider: Provider,
		total: number,
		perUrl: number,
		currency: Currency,
		currencySymbol: string
	): CalculationPriceDtoResponse {
		const dto = new CalculationPriceDtoResponse();
		dto.provider = provider;
		dto.total = total;
		dto.perUrl = perUrl;
		dto.currency = currency;
		dto.currencySymbol = currencySymbol;
		return dto;
	}

	public static fromJSON(json: Record<string, unknown>): CalculationPriceDtoResponse {
		const dto = new CalculationPriceDtoResponse();
		dto.provider = json.provider as Provider;
		dto.total = json.total as number;
		dto.perUrl = json.perUrl as number;
		dto.currency = json.currency as Currency;
		dto.currencySymbol = json.currencySymbol as string;
		return dto;
	}
}

class CalculationDtoResponse {
	public id: number;
	public hostname: string;
	public urlsCount: number;
	public urlsCountPrecise: boolean;
	public prices: CalculationPriceDtoResponse[];
	public createdAt: Date;

	public static fromEntity(calculation: Calculation): CalculationDtoResponse {
		const dto = new CalculationDtoResponse();
		dto.id = calculation.id;
		dto.hostname = calculation.hostname;
		dto.urlsCount = calculation.urlsCount;
		dto.urlsCountPrecise = calculation.urlsCountPrecise;
		dto.createdAt = calculation.createdAt;

		dto.prices = calculation.prices.map(providerPrice =>
			CalculationPriceDtoResponse.fromModel(
				providerPrice.provider,
				providerPrice.price.total,
				providerPrice.price.perUrl,
				calculation.currency,
				calculation.currencySymbol
			));

		return dto;
	}

	public static fromJSON(json: Record<string, unknown>): CalculationDtoResponse {
		const dto = new CalculationDtoResponse();
		dto.id = json.id as number;
		dto.hostname = json.hostname as string;
		dto.urlsCount = json.urlsCount as number;
		dto.urlsCountPrecise = json.urlsCountPrecise as boolean;
		dto.createdAt = new Date(json.createdAt as string);
		dto.prices = (json.prices as Record<string, unknown>[]).map(p =>
			CalculationPriceDtoResponse.fromJSON(p));
		return dto;
	}
}

export { CalculationDtoResponse, CalculationPriceDtoResponse };
