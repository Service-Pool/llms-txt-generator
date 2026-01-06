import { HttpClient } from './http.client';
import { AppConfigService } from './config.service';
import { ApiResponse, CalculateHostnameDtoResponse, MessageSuccess } from '@api/shared';

const configService = new AppConfigService();

class CalculateService extends HttpClient {
	public async analyzeHost(hostname: string): Promise<ApiResponse<MessageSuccess<CalculateHostnameDtoResponse>>> {
		return this.fetch(configService.endpoints.calculate.host(hostname), undefined, CalculateHostnameDtoResponse);
	}
}

export { CalculateService };
