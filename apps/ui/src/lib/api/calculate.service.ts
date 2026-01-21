import { HttpClient } from './http.client';
import { configService } from './config.service';
import { ApiResponse, CalculationDtoResponse, MessageSuccess } from '@api/shared';

class CalculateService extends HttpClient {
	public async calculateHost(hostname: string): Promise<ApiResponse<MessageSuccess<CalculationDtoResponse>>> {
		return this.fetch(configService.endpoints.calculate.host(hostname), CalculationDtoResponse, {
			method: 'POST'
		});
	}
}

const calculateService = new CalculateService();

export { calculateService };
