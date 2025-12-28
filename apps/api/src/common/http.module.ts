import { Module, Global } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import axiosRetry from 'axios-retry';

@Global()
@Module({
	imports: [
		HttpModule.registerAsync({
			useFactory: () => ({
				timeout: 10000,
				maxRedirects: 5
			})
		})
	],
	exports: [HttpModule]
})
export class GlobalHttpModule {
	constructor(private readonly httpService: HttpService) {
		const axiosInstance = this.httpService.axiosRef;

		axiosRetry(axiosInstance, {
			retries: 3,
			retryDelay: retryCount => axiosRetry.exponentialDelay(retryCount),
			retryCondition: (error) => {
				return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429;
			}
		});
	}
}
