/**
 * DTO для результата анализа hostname
 */
class AnalyzeHostnameDtoResponse {
	constructor(
		public hostname: string,
		public urlsCount: number,
		public isComplete: boolean
	) {}

	static fromData(hostname: string, urlsCount: number, isComplete: boolean): AnalyzeHostnameDtoResponse {
		return new AnalyzeHostnameDtoResponse(hostname, urlsCount, isComplete);
	}

	static fromJson(json: Record<string, unknown>): AnalyzeHostnameDtoResponse {
		return new AnalyzeHostnameDtoResponse(
			json.hostname as string,
			json.urlsCount as number,
			json.isComplete as boolean
		);
	}
}

export { AnalyzeHostnameDtoResponse };
