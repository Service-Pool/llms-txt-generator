import { ApiResponse, ResponseCode, MessageInvalid, MessageError, MessageSuccess, type Deserializable } from '@api/shared';
import { configService } from './config.service';

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

	protected async fetch<T>(endpoint: string, DataClass?: Deserializable<T>, options?: RequestInit): Promise<ApiResponse<MessageSuccess<T>>> {
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
			} catch (err) {
				// Re-throw HttpClientError as is
				if (err instanceof HttpClientError) {
					throw err;
				}

				const code = ((json as Record<string, unknown>).code as number) || 0;
				const message = err instanceof Error ? err.message : 'Unknown error';
				throw new HttpClientError(code, message);
			}
		} catch (err) {
			clearTimeout(timeoutId);

			// Re-throw HttpClientError as is
			if (err instanceof HttpClientError) {
				throw err;
			}

			// AbortError
			if (err instanceof Error && err.name === 'AbortError') {
				throw new HttpClientError(ResponseCode.ERROR, 'Request timeout');
			}

			// Network errors, JSON parse errors, etc.
			throw new HttpClientError(ResponseCode.ERROR, err instanceof Error ? err.message : 'Network error');
		}
	}
}

export { HttpClientError, HttpClient };
