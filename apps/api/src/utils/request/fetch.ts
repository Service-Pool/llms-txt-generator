import { ResourceUnavailableError } from '@/exceptions/resource-unavailable.exception';
import { parse } from 'tldts';
import * as linkCheckModule from 'link-check';
import { promisify } from 'util';
import type { ClsService } from 'nestjs-cls';

type LinkCheckResult = { status: string; statusCode?: number; err?: string; link: string };
type LinkCheckCallback = (
	url: string,
	opts: Record<string, unknown>,
	callback: (err: Error | null, result: LinkCheckResult) => void
) => void;

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
const linkCheckAsync = promisify<string, Record<string, unknown>, LinkCheckResult>(((linkCheckModule as any).default || linkCheckModule) as LinkCheckCallback);

class RequestUtils {
	public static readonly USER_AGENT = 'Mozilla/5.0 (compatible; LLMsTxtGeneratorBot/1.0)';
	private static clsService: ClsService;

	/**
	 * Инжектим ClsService для получения AbortSignal из контекста HTTP запроса.
	 * Вызывается при бутстрапе приложения.
	 */
	public static setClsService(cls: ClsService): void {
		RequestUtils.clsService = cls;
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
	 * Получить бинарное содержимое ответа в виде Buffer
	 * @throws Error при ошибках fetch или чтения ответа
	 */
	public static async buffer(url: string, timeoutMs: number | null = 2000, options: RequestInit = {}): Promise<Buffer> {
		// Добавляем User-Agent если не указан
		options = {
			...options,
			headers: {
				'User-Agent': RequestUtils.USER_AGENT,
				...options.headers
			}
		};

		const res = await RequestUtils.fetch(url, timeoutMs, options);
		const arrayBuffer = await res.arrayBuffer();
		return Buffer.from(arrayBuffer);
	}

	/**
	 * Выполняет fetch, следуя редиректам без проверки hostname mismatch.
	 * Используется для резолва канонических URL (например, example.com → www.example.com).
	 * @param url URL для запроса
	 * @param timeoutMs Таймаут в мс (если null — без таймаута)
	 * @param options fetch options
	 * @returns Response с финальным URL после всех редиректов
	 * @throws Error при сетевых ошибках или таймауте
	 */
	public static async trace(url: string, timeoutMs: number | null = 5000, options: RequestInit = {}): Promise<Response> {
		return RequestUtils.fetch(url, timeoutMs, options);
	}

	/**
	 * Выполняет fetch с таймаутом (AbortController).
	 * Разрешает редиректы только внутри одного registrable domain (*.example.com ↔ example.com, *.example.com.au ↔ example.com.au).
	 * Использует Public Suffix List для правильной обработки многокомпонентных TLD (.com.au, .co.uk и т.д.).
	 * @param url URL для запроса
	 * @param timeoutMs Таймаут в мс (если null — без таймаута)
	 * @param options fetch options
	 * @throws Error при сетевых ошибках, таймауте или неуспешном HTTP статусе
	 */
	private static async fetch(url: string, timeoutMs: number | null = 2000, options: RequestInit = {}): Promise<Response> {
		// Получаем AbortSignal из CLS контекста (если клиент прервал запрос)
		const externalSignal = RequestUtils.clsService?.get<AbortSignal>('abortSignal');

		// Если клиент уже прервал запрос - выбрасываем ошибку сразу
		if (externalSignal?.aborted) {
			throw new ResourceUnavailableError(`Request cancelled by client for ${url}`);
		}

		// Формируем список сигналов
		const signals: AbortSignal[] = [];
		if (externalSignal) signals.push(externalSignal);
		if (timeoutMs) signals.push(AbortSignal.timeout(timeoutMs));

		// Создаем один комбинированный сигнал - Node.js сам свяжет их и очистит память
		const combinedSignal = signals.length > 0 ? AbortSignal.any(signals) : undefined;

		// Добавляем User-Agent если не указан
		options = {
			...options,
			headers: {
				'User-Agent': RequestUtils.USER_AGENT,
				...options.headers
			}
		};

		try {
			const response = await fetch(url, { ...options, signal: combinedSignal });

			// Проверяем HTTP статус-код
			if (!response.ok) {
				throw new ResourceUnavailableError(`HTTP ${response.status} ${response.statusText} for ${url}`);
			}

			// Проверяем, что редирект произошёл в пределах одного apex domain
			const requestedHostname = new URL(url).hostname;
			const finalHostname = new URL(response.url).hostname;

			if (requestedHostname !== finalHostname) {
				const requestedApex = RequestUtils.getApexDomain(requestedHostname);
				const finalApex = RequestUtils.getApexDomain(finalHostname);

				if (requestedApex !== finalApex) {
					throw new ResourceUnavailableError(`Cross-domain redirect detected: ${requestedHostname} (${requestedApex}) → ${finalHostname} (${finalApex}). Possible ISP redirect or domain hijacking.`);
				}
			}

			return response;
		} catch (error) {
			if (error instanceof Error) {
				// Пробрасываем ResourceUnavailableError как есть
				if (error instanceof ResourceUnavailableError) {
					throw error;
				}

				// AbortError от AbortController означает таймаут или отмену запроса клиентом
				if (error.name === 'AbortError') {
					// Если внешний signal был отменён - это отмена клиента, иначе таймаут
					if (externalSignal?.aborted) {
						throw new ResourceUnavailableError(`Request cancelled by client for ${url}`);
					}
					throw new ResourceUnavailableError(`Request timeout (${timeoutMs}ms) for ${url}`);
				}

				// Извлекаем детали из error.cause для более информативного сообщения
				if (error.cause && typeof error.cause === 'object' && error.cause !== null && 'code' in error.cause) {
					const code = (error.cause as { code: string; message?: string }).code;
					const message = (error.cause as { code: string; message?: string }).message;

					switch (code) {
						case 'ENOTFOUND':
							throw new ResourceUnavailableError(`Domain not found: ${url} (DNS resolution failed)`);
						case 'ECONNREFUSED':
							throw new ResourceUnavailableError(`Connection refused: ${url}`);
						case 'ETIMEDOUT':
						case 'ENETUNREACH':
							throw new ResourceUnavailableError(`Network timeout or unreachable: ${url}`);
						default:
							// Другие сетевые ошибки с причиной
							throw new ResourceUnavailableError(`Network error for ${url}: ${message || code || 'unknown cause'}`);
					}
				}
			}

			// Пробрасываем остальные неизвестные ошибки
			throw error;
		}
	}

	/**
	 * Проверяет доступность URL с помощью link-check.
	 * @param url URL для проверки
	 * @returns true если URL доступен (status 'alive'), false в противном случае
	 */
	public static async exists(url: string): Promise<boolean> {
		try {
			const result = await linkCheckAsync(url, {
				timeout: '3s',
				retryOn429: true,
				retryCount: 2,
				user_agent: RequestUtils.USER_AGENT
			});

			return result.status === 'alive';
		} catch {
			return false;
		}
	}

	/**
	 * Извлекает registrable domain (apex domain) из hostname используя Public Suffix List.
	 * Правильно обрабатывает многокомпонентные TLD (.com.au, .co.uk и т.д.).
	 * Примеры:
	 *   www.example.com → example.com
	 *   api.shop.com.au → shop.com.au
	 *   sub.example.co.uk → example.co.uk
	 */
	private static getApexDomain(hostname: string): string {
		const parsed = parse(hostname);
		return parsed.domain || hostname;
	}
}

export { RequestUtils };
