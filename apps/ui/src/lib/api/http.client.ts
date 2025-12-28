import { ApiResponseModel } from '@api/shared';
import { AppConfigService } from './config.service';

const configService = new AppConfigService();

export class ApiError extends Error {
	constructor(
		public readonly status: number,
		message: string
	) {
		super(message);
		this.name = 'ApiError';
	}
}

export class HttpClient {
	protected readonly baseUrl: string;
	protected readonly timeout: number;

	constructor() {
		this.baseUrl = configService.api.baseUrl;
		this.timeout = configService.http.timeout;
	}

	protected async fetch<T>(endpoint: string, options?: RequestInit): Promise<ApiResponseModel<T>> {
		const url = `${this.baseUrl}${endpoint}`;

		const controller = new AbortController();
		const timeoutId = setTimeout(() => {
			controller.abort();
		}, this.timeout);

		try {
			const response = await fetch(url, {
				...options,
				headers: {
					'Content-Type': 'application/json',
					...options?.headers
				},
				credentials: 'include',
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			const json = await response.json() as Record<string, unknown>;
			const data = new ApiResponseModel<T>(
				json.code as number,
				json.message as T,
				json.error as string | undefined
			);

			if (!response.ok || (data.code >= 400)) {
				const errorMessage = data.error || 'Request failed';
				throw new ApiError(data.code || response.status, errorMessage);
			}

			return data;
		} catch (error) {
			clearTimeout(timeoutId);

			if (error instanceof ApiError) {
				throw error;
			}

			if (error instanceof Error && error.name === 'AbortError') {
				throw new ApiError(0, 'Request timeout');
			}

			throw new ApiError(0, error instanceof Error ? error.message : 'Network error');
		}
	}
}
