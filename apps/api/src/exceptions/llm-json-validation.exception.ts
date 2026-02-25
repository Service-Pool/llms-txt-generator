/**
 * Ошибка валидации JSON ответа от LLM
 */
class LlmJsonValidationException extends Error {
	constructor(
		message: string,
		public readonly invalidResponse: unknown,
		public readonly attemptNumber: number
	) {
		super(message);
		this.name = 'LlmJsonValidationException';
	}
}

export { LlmJsonValidationException };
