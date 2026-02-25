import { LlmResponseCountMismatchException } from '@/exceptions/llm-response-count-mismatch.exception';
import { LlmInvalidSummaryFieldException } from '@/exceptions/llm-invalid-summary-field.exception';
import { LlmJsonValidationException } from '@/exceptions/llm-json-validation.exception';

/**
 * Универсальный валидатор для ответов от LLM провайдеров.
 * Содержит методы для валидации структуры ответов.
 */
class LlmResponseValidator {
	/**
	 * Проверка количества элементов в массиве
	 */
	static validateCount(result: unknown, expectedCount: number, attemptNumber: number): void {
		if (!Array.isArray(result)) {
			throw new Error('Response is not a JSON array');
		}

		if (result.length !== expectedCount) {
			throw new LlmResponseCountMismatchException(
				`Expected ${expectedCount} summaries, got ${result.length}`,
				expectedCount,
				result.length,
				result,
				attemptNumber
			);
		}
	}

	/**
	 * Проверка наличия поля summary в каждом элементе массива
	 */
	static validateSummaryFields(result: unknown, attemptNumber: number): void {
		if (!Array.isArray(result)) {
			return; // Проверку на массив делает другой валидатор
		}

		result.forEach((item, idx) => {
			if (!item || typeof item !== 'object') {
				throw new LlmInvalidSummaryFieldException(
					`Invalid item at index ${idx}: not an object`,
					idx,
					item,
					attemptNumber
				);
			}

			const summaryItem = item as Record<string, unknown>;
			if (!summaryItem.summary || typeof summaryItem.summary !== 'string') {
				throw new LlmInvalidSummaryFieldException(
					`Invalid summary at index ${idx}: missing or invalid "summary" field`,
					idx,
					item,
					attemptNumber
				);
			}
		});
	}

	/**
	 * Проверка что результат - непустая строка
	 */
	static validateStringType(result: unknown, operationName: string, attemptNumber: number): void {
		if (typeof result !== 'string' || result.length === 0) {
			throw new LlmJsonValidationException(
				`${operationName} returned non-string or empty result`,
				result,
				attemptNumber
			);
		}
	}

	/**
	 * Проверка наличия поля description в объекте
	 */
	static validateDescriptionField(result: unknown, attemptNumber: number): void {
		if (!result || typeof result !== 'object') {
			throw new LlmJsonValidationException(
				`Expected object with description field, got ${typeof result}`,
				result,
				attemptNumber
			);
		}

		const obj = result as Record<string, unknown>;
		if (!obj.description || typeof obj.description !== 'string' || obj.description.length === 0) {
			throw new LlmJsonValidationException(
				`Missing or invalid "description" field in response`,
				result,
				attemptNumber
			);
		}
	}

	/**
	 * Проверка что результат - массив непустых строк
	 */
	static validateStringArrayType(result: unknown, operationName: string, attemptNumber: number): void {
		if (!Array.isArray(result)) {
			throw new LlmJsonValidationException(
				`${operationName} returned non-array result`,
				result,
				attemptNumber
			);
		}

		const invalidIndex = result.findIndex(item => typeof item !== 'string' || item.length === 0);
		if (invalidIndex !== -1) {
			throw new LlmJsonValidationException(
				`${operationName} returned invalid string at index ${invalidIndex}`,
				result,
				attemptNumber
			);
		}
	}
}

export { LlmResponseValidator };
