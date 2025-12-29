import { HttpClient } from './http.client';
import { AppConfigService } from './config.service';
import { ApiResponseModel, AnalyzeHostnameDtoResponse } from '@api/shared';

const configService = new AppConfigService();

export class StatsService extends HttpClient {
	public async analyzeHost(hostname: string): Promise<ApiResponseModel<AnalyzeHostnameDtoResponse>> {
		const response = await this.fetch<Record<string, unknown>>(configService.endpoints.stats.host(hostname));

		return new ApiResponseModel(
			response.code,
			AnalyzeHostnameDtoResponse.fromJson(response.message),
			response.error
		);
	}
}
