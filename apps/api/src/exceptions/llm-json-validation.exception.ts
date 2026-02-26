import { LlmBaseException } from '@/exceptions/llm-base.exception';

/**
 * Ошибка валидации JSON ответа от LLM
 */
class LlmJsonValidationException extends LlmBaseException {
	constructor(
		message: string,
		public readonly invalidResponse: unknown,
		attemptNumber: number
	) {
		super(message, attemptNumber);
		this.name = 'LlmJsonValidationException';
	}
}

export { LlmJsonValidationException };
