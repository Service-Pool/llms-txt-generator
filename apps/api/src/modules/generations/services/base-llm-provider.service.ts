interface PageSummary {
	url: string;
	title: string;
	summary: string;
}

/**
 * Базовый абстрактный класс для всех LLM провайдеров
 * Конкретные провайдеры (Gemini, Ollama) наследуют этот класс
 */
abstract class BaseLLMProviderService {
	/**
	 * Генерирует краткое саммари для одной страницы
	 * @param content - Текстовый контент страницы (до 3000 слов)
	 * @param title - Заголовок страницы
	 * @returns Краткое саммари страницы
	 */
	abstract generateSummary(content: string, title: string): Promise<string>;

	/**
	 * Генерирует общее описание сайта на основе всех саммари страниц
	 * @param summaries - Массив саммари всех страниц сайта
	 * @returns Общее описание сайта
	 */
	abstract generateDescription(summaries: PageSummary[]): Promise<string>;
}

export { PageSummary, BaseLLMProviderService };
