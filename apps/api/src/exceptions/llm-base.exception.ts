/**
 * Базовое исключение для всех ошибок связанных с LLM операциями.
 * Используется для проверки в circuit breaker и retry логике.
 */
class LlmBaseException extends Error {
	constructor(
		message: string,
		public readonly attemptNumber: number
	) {
		super(message);
		this.name = 'LlmBaseException';
	}
}

export { LlmBaseException };
