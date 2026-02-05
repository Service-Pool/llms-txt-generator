import {
	ApiResponse,
	ResponseCode,
	type Deserializable
} from '@api/shared';
import { configService } from './config.service';
import { UIError } from '$lib/errors/ui-error';

/**
 * HTTP Client with automatic deserialization
 * Returns real class instances with methods, not plain JSON objects
 */
class HttpClient {
	protected readonly baseUrl: string;
	protected readonly timeout: number;

	constructor() {
		this.baseUrl = configService.api.baseUrl;
		this.timeout = configService.http.timeout;
	}

	/**
	 * Generic fetch with deserialization support
	 * @param endpoint - API endpoint (e.g., '/orders')
	 * @param DataClass - Class constructor for deserialization (e.g., Order)
	 * @param options - Fetch options
	 * @returns Deserialized response with class instances
	 */
	protected async fetch<T>(endpoint: string, DataClass?: Deserializable<T>, options?: RequestInit): Promise<ApiResponse<T>> {
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
				const apiResponse = ApiResponse.fromJSON<T>(
					json as ApiResponse<unknown>,
					DataClass
				);

				switch (apiResponse.getСode()) {
					case ResponseCode.SUCCESS:
						return apiResponse;

					case ResponseCode.INVALID:
						throw new UIError(
							apiResponse.getСode(),
							apiResponse.getMessage(),
							apiResponse.getViolations()
						);

					case ResponseCode.ERROR:
						throw new UIError(
							apiResponse.getСode(),
							apiResponse.getMessage()
						);

					default:
						throw new Error('Unexpected response code');
				}
			} catch (error) {
				if (error instanceof UIError) {
					throw error;
				}

				const code = ((json as Record<string, unknown>).code as number) || 0;
				const message = error instanceof Error ? error.message : 'Unknown error';
				throw new UIError(code, message);
			}
		} catch (error) {
			clearTimeout(timeoutId);

			if (error instanceof UIError) {
				throw error;
			}

			// AbortError
			if (error instanceof Error && error.name === 'AbortError') {
				throw new UIError(ResponseCode.ERROR, 'Request timeout');
			}

			// Network errors, JSON parse errors, etc.
			throw new UIError(ResponseCode.ERROR, error instanceof Error ? error.message : 'Network error');
		}
	}
}

export { HttpClient };
