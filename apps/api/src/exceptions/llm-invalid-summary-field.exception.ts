/**
 * Исключение для случаев, когда LLM вернул некорректный формат саммари
 * (отсутствует поле summary или оно не строка)
 *
 * При перехвате этого исключения можно повторить запрос с уточнённым промптом
 */
class LlmInvalidSummaryFieldException extends Error {
	constructor(
		message: string,
		public readonly summaryIndex: number,
		public readonly invalidItem: unknown,
		public readonly attemptNumber: number
	) {
		super(message);
		this.name = 'LlmInvalidSummaryFieldException';
	}
}

export { LlmInvalidSummaryFieldException };
