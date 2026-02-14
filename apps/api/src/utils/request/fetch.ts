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
	 */
	public static async text(url: string, timeoutMs: number | null = 2000, options: RequestInit = {}): Promise<string | null> {
		const res = await RequestUtils.fetch(url, timeoutMs, options);
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
		} finally {
			if (id) clearTimeout(id);
		}
	}
}

export { RequestUtils };
