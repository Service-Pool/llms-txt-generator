class RequestUtils {
	/**
	 * HEAD-запрос с таймаутом для проверки доступности ресурса
	 */
	static async exists(url: string, timeoutMs: number | null = 2000): Promise<boolean> {
		const res = await RequestUtils.fetch(url, timeoutMs, { method: 'HEAD' });
		return !!res && res.ok;
	}

	/**
	 * Получить текст ответа с таймаутом
	 */
	static async text(url: string, timeoutMs: number | null = 2000, options: RequestInit = {}): Promise<string | null> {
		const res = await RequestUtils.fetch(url, timeoutMs, options);
		if (!res || !res.ok) return null;
		return await res.text();
	}

	/**
	 * Выполняет fetch с таймаутом (AbortController).
	 * @param url URL для запроса
	 * @param timeoutMs Таймаут в мс (если null — без таймаута)
	 * @param options fetch options
	 */
	private static async fetch(url: string, timeoutMs: number | null = 2000, options: RequestInit = {}): Promise<Response | null> {
		let controller: AbortController;
		let id: NodeJS.Timeout;

		if (timeoutMs != null) {
			controller = new AbortController();
			id = setTimeout(() => {
				controller.abort();
			}, timeoutMs);
		}

		try {
			return await fetch(url, { ...options, signal: controller?.signal });
		} catch {
			return null;
		} finally {
			if (id) clearTimeout(id);
		}
	}
}

export { RequestUtils };
