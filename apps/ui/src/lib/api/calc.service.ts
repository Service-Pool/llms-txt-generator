import { HttpClient } from './http.client';
import { AppConfigService } from './config.service';
import { ApiResponse, CalculationDtoResponse, MessageSuccess } from '@api/shared';

const configService = new AppConfigService();

class CalculateService extends HttpClient {
	public async calculateHost(hostname: string): Promise<ApiResponse<MessageSuccess<CalculationDtoResponse>>> {
		return this.fetch(configService.endpoints.calculate.host(hostname), CalculationDtoResponse, {
			method: 'POST'
		});
	}
}

export { CalculateService };
