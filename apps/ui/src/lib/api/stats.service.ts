import { HttpClient } from './http.client';
import { AppConfigService } from './config.service';
import { ApiResponse, AnalyzeHostnameDtoResponse, MessageSuccess } from '@api/shared';

const configService = new AppConfigService();

export class StatsService extends HttpClient {
	public async analyzeHost(hostname: string): Promise<ApiResponse<MessageSuccess<AnalyzeHostnameDtoResponse>>> {
		return this.fetch(configService.endpoints.stats.host(hostname), undefined, AnalyzeHostnameDtoResponse);
	}
}
