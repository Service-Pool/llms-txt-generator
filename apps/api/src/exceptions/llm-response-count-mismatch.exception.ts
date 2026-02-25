/**
 * Исключение для случаев когда LLM вернул неправильное количество элементов
 * Например: запросили 5 summaries, получили 3
 *
 * Используется в resilience layer для retry с модифицированным промптом
 */
class LlmResponseCountMismatchException extends Error {
	constructor(
		message: string,
		public readonly expected: number,
		public readonly received: number,
		public readonly invalidResponse: unknown,
		public readonly attemptNumber: number
	) {
		super(message);
		this.name = 'LlmResponseCountMismatchException';
	}
}

export { LlmResponseCountMismatchException };
