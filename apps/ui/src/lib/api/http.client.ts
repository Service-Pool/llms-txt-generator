import { ApiResponse, ResponseCode, MessageInvalid, MessageError, MessageSuccess, type Deserializable } from '@api/shared';
import { AppConfigService } from './config.service';

const configService = new AppConfigService();

class HttpClientError extends Error {
	constructor(
		public readonly code: ResponseCode,
		public readonly message: string,
		public readonly violations: string[] | null = null
	) {
		super(message);
		this.name = 'HttpClientError';
	}
}

class HttpClient {
	protected readonly baseUrl: string;
	protected readonly timeout: number;

	constructor() {
		this.baseUrl = configService.api.baseUrl;
		this.timeout = configService.http.timeout;
	}

	protected async fetch<T>(endpoint: string, options?: RequestInit, DataClass?: Deserializable<T>): Promise<ApiResponse<MessageSuccess<T>>> {
		const url = `${this.baseUrl}${endpoint}`;

		const controller = new AbortController();
		const timeoutId = setTimeout(() => {
			controller.abort();
		}, this.timeout);

		try {
			const headers: HeadersInit = {
				...options?.headers
			};

			// Only add Content-Type if there's a body
			if (options?.body && typeof headers === 'object' && !Array.isArray(headers)) {
				(headers as Record<string, string>)['Content-Type'] = 'application/json';
			}

			const response = await fetch(url, {
				...options,
				headers,
				credentials: 'include',
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			const json: unknown = await response.json();

			try {
				const apiResponse = ApiResponse.fromJSON<T>(json as { code: ResponseCode; message: unknown }, DataClass);

				// Handle error responses
				const message = apiResponse.getMessage();

				if (message instanceof MessageInvalid) {
					throw new HttpClientError(apiResponse.getСode(), 'Validation failed', message.violations);
				}

				if (message instanceof MessageError) {
					throw new HttpClientError(apiResponse.getСode(), message.error, [message.error]);
				}

				return apiResponse as ApiResponse<MessageSuccess<T>>;
			} catch (error) {
				// Re-throw HttpClientError as is
				if (error instanceof HttpClientError) {
					throw error;
				}

				const code = ((json as Record<string, unknown>).code as number) || 0;
				const message = error instanceof Error ? error.message : 'Unknown error';
				throw new HttpClientError(code, message);
			}
		} catch (error) {
			clearTimeout(timeoutId);

			// Re-throw HttpClientError as is
			if (error instanceof HttpClientError) {
				throw error;
			}

			// AbortError
			if (error instanceof Error && error.name === 'AbortError') {
				throw new HttpClientError(0, 'Request timeout');
			}

			// Network errors, JSON parse errors, etc.
			throw new HttpClientError(0, error instanceof Error ? error.message : 'Network error');
		}
	}
}

export { HttpClientError, HttpClient };
