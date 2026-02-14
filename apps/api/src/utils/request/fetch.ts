class RequestUtils {
	/**
	 * HEAD-запрос с таймаутом для проверки доступности ресурса
	 */
	public static async exists(url: string, timeoutMs: number | null = 2000): Promise<boolean> {
		try {
			const res = await RequestUtils.fetch(url, timeoutMs, { method: 'HEAD' });
			return !!res && res.ok;
		} catch {
			return false;
		}
	}

	/**
	 * Получить текст ответа с таймаутом
	 * @throws Error при ошибках fetch или чтения ответа
	 */
	public static async text(url: string, timeoutMs: number | null = 2000, options: RequestInit = {}): Promise<string> {
		const res = await RequestUtils.fetch(url, timeoutMs, options);
		return await res.text();
	}

	/**
	 * Выполняет fetch с таймаутом (AbortController).
	 * @param url URL для запроса
	 * @param timeoutMs Таймаут в мс (если null — без таймаута)
	 * @param options fetch options
	 * @throws Error при сетевых ошибках, таймауте или неуспешном HTTP статусе
	 */
	private static async fetch(url: string, timeoutMs: number | null = 2000, options: RequestInit = {}): Promise<Response> {
		let controller: AbortController;
		let id: NodeJS.Timeout;

		if (timeoutMs != null) {
			controller = new AbortController();
			id = setTimeout(() => {
				controller.abort();
			}, timeoutMs);
		}

		try {
			const response = await fetch(url, { ...options, signal: controller?.signal });

			// Проверяем HTTP статус-код
			if (!response.ok) {
				throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
			}

			// Проверяем, что не произошла подмена домена (заглушка провайдера)
			const requestedHostname = new URL(url).hostname;
			const finalHostname = new URL(response.url).hostname;

			if (requestedHostname !== finalHostname) {
				throw new Error(`Domain mismatch: requested ${requestedHostname}, got ${finalHostname}. Possible ISP redirect or domain hijacking.`);
			}

			return response;
		} catch (error) {
			if (error instanceof Error) {
				// Пробрасываем наши ошибки валидации как есть
				if (error.message.startsWith('Domain mismatch')) {
					throw error;
				}

				// AbortError от AbortController означает таймаут
				if (error.name === 'AbortError') {
					throw new Error(`Request timeout (${timeoutMs}ms) for ${url}`);
				}

				// Извлекаем детали из error.cause для более информативного сообщения
				if (error.cause && typeof error.cause === 'object' && error.cause !== null && 'code' in error.cause) {
					const code = (error.cause as { code: string; message?: string }).code;
					const message = (error.cause as { code: string; message?: string }).message;

					switch (code) {
						case 'ENOTFOUND':
							throw new Error(`Domain not found: ${url} (DNS resolution failed)`);
						case 'ECONNREFUSED':
							throw new Error(`Connection refused: ${url}`);
						case 'ETIMEDOUT':
						case 'ENETUNREACH':
							throw new Error(`Network timeout or unreachable: ${url}`);
						default:
							// Другие сетевые ошибки с причиной
							throw new Error(`Network error for ${url}: ${message || code || 'unknown cause'}`);
					}
				}
			}

			// Пробрасываем остальные неизвестные ошибки
			throw error;
		} finally {
			if (id) clearTimeout(id);
		}
	}
}

export { RequestUtils };
