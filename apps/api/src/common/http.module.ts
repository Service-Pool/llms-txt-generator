import { Module, Global, Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';

@Injectable()
class HttpService {
	private readonly axiosInstance: AxiosInstance;

	constructor() {
		this.axiosInstance = axios.create({
			timeout: 10000,
			maxRedirects: 5
		});

		axiosRetry(this.axiosInstance, {
			retries: 3,
			retryDelay: retryCount => axiosRetry.exponentialDelay(retryCount),
			retryCondition: (error) => {
				return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429;
			}
		});
	}

	public get axios(): AxiosInstance {
		return this.axiosInstance;
	}
}

@Global()
@Module({
	providers: [HttpService],
	exports: [HttpService]
})
class HttpModule {}

export { HttpModule, HttpService };
