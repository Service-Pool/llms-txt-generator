/**
 * DTO для результата анализа hostname
 */
class AnalyzeHostnameDtoResponse {
	constructor(
		public hostname: string,
		public urlsCount: number,
		public isComplete: boolean,
		public estimatedPrice: number,
		public currency: string
	) { }

	static fromData(hostname: string, urlsCount: number, isComplete: boolean, estimatedPrice: number, currency: string): AnalyzeHostnameDtoResponse {
		return new AnalyzeHostnameDtoResponse(hostname, urlsCount, isComplete, estimatedPrice, currency);
	}

	static fromJSON(json: Record<string, unknown>): AnalyzeHostnameDtoResponse {
		return new AnalyzeHostnameDtoResponse(
			json.hostname as string,
			json.urlsCount as number,
			json.isComplete as boolean,
			json.estimatedPrice as number,
			json.currency as string
		);
	}
}

export { AnalyzeHostnameDtoResponse };
