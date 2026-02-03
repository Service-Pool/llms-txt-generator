class PageContent {
	private _summary: string | null = null;

	constructor(
		private readonly _url: string,
		private readonly _title: string,
		private readonly _content: string
	) { }

	get url(): string {
		return this._url;
	}

	get title(): string {
		return this._title;
	}

	get content(): string {
		return this._content;
	}

	get summary(): string | null {
		return this._summary;
	}

	set summary(value: string) {
		this._summary = value;
	}
}

/**
 * Базовый абстрактный класс для всех LLM провайдеров
 * Конкретные провайдеры (Gemini, Ollama) наследуют этот класс
 */
abstract class LLMProviderService {
	/**
	 * Генерирует саммари для батча страниц за один вызов LLM
	 * @param pages - Массив страниц с контентом и заголовками
	 * @returns Массив саммари в том же порядке
	 */
	abstract generateBatchSummaries(pages: PageContent[]): Promise<string[]>;

	/**
	 * Генерирует общее описание сайта на основе всех саммари страниц
	 * @param pages - Массив страниц с саммари
	 * @returns Общее описание сайта
	 */
	abstract generateDescription(pages: PageContent[]): Promise<string>;
}

export { PageContent, LLMProviderService };
