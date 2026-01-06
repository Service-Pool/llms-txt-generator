import { Provider } from '../../../enums/provider.enum';

/**
 * DTO для информации о цене
 */
class AnalyzeHostnamePriceDtoResponse {
	constructor(
		public provider: Provider,
		public value: number,
		public currency: string,
		public symbol: string
	) { }

	static fromData(provider: Provider, estimatedPrice: number, currency: string, symbol: string): AnalyzeHostnamePriceDtoResponse {
		return new AnalyzeHostnamePriceDtoResponse(provider, estimatedPrice, currency, symbol);
	}

	static fromJSON(json: Record<string, unknown>): AnalyzeHostnamePriceDtoResponse {
		return new AnalyzeHostnamePriceDtoResponse(
			json.provider as Provider,
			json.value as number,
			json.currency as string,
			json.symbol as string
		);
	}
}

/**
 * DTO для результата анализа hostname
 */
class AnalyzeHostnameDtoResponse {
	constructor(
		public hostname: string,
		public urlsCount: number,
		public isComplete: boolean,
		public prices: AnalyzeHostnamePriceDtoResponse[]
	) { }

	static fromData(hostname: string, urlsCount: number, isComplete: boolean, prices: AnalyzeHostnamePriceDtoResponse[]): AnalyzeHostnameDtoResponse {
		return new AnalyzeHostnameDtoResponse(hostname, urlsCount, isComplete, prices);
	}

	static fromJSON(json: Record<string, unknown>): AnalyzeHostnameDtoResponse {
		const prices = (json.prices as Array<Record<string, unknown>>).map(p => AnalyzeHostnamePriceDtoResponse.fromJSON(p));
		return new AnalyzeHostnameDtoResponse(
			json.hostname as string,
			json.urlsCount as number,
			json.isComplete as boolean,
			prices
		);
	}
}

export { AnalyzeHostnameDtoResponse, AnalyzeHostnamePriceDtoResponse };
