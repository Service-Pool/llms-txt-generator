import { LlmBaseException } from '@/exceptions/llm-base.exception';

/**
 * Исключение для случаев, когда LLM вернул некорректный формат саммари
 * (отсутствует поле summary или оно не строка)
 *
 * При перехвате этого исключения можно повторить запрос с уточнённым промптом
 */
class LlmInvalidSummaryFieldException extends LlmBaseException {
	constructor(
		message: string,
		public readonly summaryIndex: number,
		public readonly invalidItem: unknown,
		attemptNumber: number
	) {
		super(message, attemptNumber);
		this.name = 'LlmInvalidSummaryFieldException';
	}
}

export { LlmInvalidSummaryFieldException };
