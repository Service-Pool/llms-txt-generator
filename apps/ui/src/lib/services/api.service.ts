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

	private readonly DELAY = 0;

	constructor() {
		this.baseUrl = configService.api.baseUrl;
		this.timeout = configService.http.timeout;
	}

	/**
	 * Generic fetch with deserialization support
	 * @param endpoint - API endpoint (e.g., '/orders')
	 * @param DataClass - Class constructor for deserialization (e.g., Order)
	 * @param options - Fetch options
	 * @param fetchFn - Optional fetch function from SvelteKit load context
	 * @returns Deserialized response with class instances
	 */
	protected async fetch<T>(endpoint: string, DataClass?: Deserializable<T>, options?: RequestInit, fetchFn?: typeof fetch): Promise<ApiResponse<T>> {
		const url = `${this.baseUrl}${endpoint}`;

		// Комбинируем внешний signal (если есть) с timeout
		const signals: AbortSignal[] = [];
		if (options?.signal) signals.push(options.signal);
		signals.push(AbortSignal.timeout(this.timeout));

		const combinedSignal = AbortSignal.any(signals);

		try {
			const headers: HeadersInit = {
				...options?.headers
			};

			// Only add Content-Type if there's a body
			if (options?.body && typeof headers === 'object' && !Array.isArray(headers)) {
				(headers as Record<string, string>)['Content-Type'] = 'application/json';
			}

			// Emulate 3 second delay
			await new Promise(resolve => setTimeout(resolve, this.DELAY));

			const fetchFunction = fetchFn || fetch;
			const response = await fetchFunction(url, {
				...options,
				headers,
				credentials: 'include',
				signal: combinedSignal
			});

			const json: unknown = await response.json();

			const apiResponse = ApiResponse.fromJSON<T>(
				json as ApiResponse<unknown>,
				DataClass
			);

			switch (apiResponse.getCode()) {
				case ResponseCode.SUCCESS:
					return apiResponse;

				case ResponseCode.INVALID:
					throw new UIError(
						apiResponse.getCode() as ResponseCode,
						apiResponse.getMessage(),
						apiResponse.getViolations()
					);

				default:
					throw new Error(apiResponse.getMessage());
			}
		} catch (exception) {
			if (exception instanceof UIError) {
				throw exception;
			}

			// AbortError - может быть как от timeout, так и от внешнего signal
			if (exception instanceof Error && exception.name === 'AbortError') {
				// Если внешний signal был отменён - это отмена пользователя
				if (options?.signal?.aborted) {
					throw new Error('Request cancelled');
				}
				throw new Error('Request timeout');
			}

			// Network errors, JSON parse errors, etc.
			throw new Error(exception instanceof Error ? exception.message : 'Network error');
		}
	}
}

export { HttpClient };
