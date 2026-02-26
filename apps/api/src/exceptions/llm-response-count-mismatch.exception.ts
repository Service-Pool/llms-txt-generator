import { LlmBaseException } from '@/exceptions/llm-base.exception';

/**
 * Исключение для случаев когда LLM вернул неправильное количество элементов
 * Например: запросили 5 summaries, получили 3
 *
 * Используется в resilience layer для retry с модифицированным промптом
 */
class LlmResponseCountMismatchException extends LlmBaseException {
	constructor(
		message: string,
		public readonly expected: number,
		public readonly received: number,
		public readonly invalidResponse: unknown,
		attemptNumber: number
	) {
		super(message, attemptNumber);
		this.name = 'LlmResponseCountMismatchException';
	}
}

export { LlmResponseCountMismatchException };
