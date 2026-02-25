/**
 * Валидатор JSON ответов от LLM провайдеров
 */
class LlmJsonValidator {
	/**
	 * Проверка что ответ является валидным JSON array строк
	 */
	static validateStringArray(response: unknown): response is string[] {
		if (!Array.isArray(response)) {
			return false;
		}

		return response.every(item => typeof item === 'string' && item.length > 0);
	}

	/**
	 * Проверка что ответ является непустой строкой
	 */
	static validateString(response: unknown): response is string {
		return typeof response === 'string' && response.length > 0;
	}

	/**
	 * Извлечение JSON из markdown кодового блока (если LLM вернул ```json...```)
	 */
	static extractJsonFromMarkdown(text: string): string {
		const jsonBlockMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
		if (jsonBlockMatch) {
			return jsonBlockMatch[1].trim();
		}
		return text.trim();
	}

	/**
	 * Попытка парсинга JSON с fallback на извлечение из markdown
	 */
	static parseJsonResponse<T>(response: string): T {
		try {
			return JSON.parse(response) as T;
		} catch {
			const extracted = this.extractJsonFromMarkdown(response);
			return JSON.parse(extracted) as T;
		}
	}
}

export { LlmJsonValidator };
