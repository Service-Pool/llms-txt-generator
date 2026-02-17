/**
 * Ошибка недоступности внешнего ресурса
 *
 * Универсальное исключение для HTTP/сетевых ошибок при запросе внешних ресурсов:
 * - HTTP 4xx, 5xx статусы
 * - Network errors (DNS, timeout, connection refused)
 * - Domain hijacking/ISP redirects
 *
 * Используется низкоуровневыми утилитами (fetch, HTTP клиенты),
 * которые не знают о контексте использования (генерация, краулинг, API).
 *
 * Вышестоящий слой может обработать эту ошибку соответствующим образом:
 * - В batch-обработке: пропустить ресурс и продолжить
 * - В критичном API: вернуть ошибку пользователю
 */
class ResourceUnavailableError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ResourceUnavailableError';
	}
}

export { ResourceUnavailableError };
