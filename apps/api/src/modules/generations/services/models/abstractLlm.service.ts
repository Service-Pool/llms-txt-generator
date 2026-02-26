import { Logger } from '@nestjs/common';
import { ProcessedPage } from '@/modules/generations/models/processed-page.model';
import { LlmJsonValidationException } from '@/exceptions/llm-json-validation.exception';
import { LlmResponseCountMismatchException } from '@/exceptions/llm-response-count-mismatch.exception';
import { LlmInvalidSummaryFieldException } from '@/exceptions/llm-invalid-summary-field.exception';
import { llmLogger } from '@/config/config.logger';

/**
 * Конфигурация resilience для LLM операций
 */
interface ResilienceConfig {
	retry: {
		maxAttempts: number;
		initialDelayMs: number;
		maxDelayMs: number;
		backoffMultiplier: number;
	};
	timeout: {
		durationMs: number;
	};
}

/**
 * Конфигурация валидации для результата LLM
 */
interface ValidationConfig {
	/** Ожидаемое количество элементов в массиве */
	expectedCount?: number;
	/** Проверять наличие поля summary в каждом элементе массива */
	requireSummaryFields?: boolean;
	/** Проверять наличие поля description в объекте */
	requireDescriptionField?: boolean;
}

/**
 * Опции для выполнения операции с retry и timeout
 */
interface ResilienceOptions {
	/** Исходный промпт для LLM */
	initialPrompt: string;
	/** Название операции для логирования */
	operationName: string;
	/** Конфигурация валидации результата */
	validation?: ValidationConfig;
	/** Повторять попытки при ошибках валидации */
	retryOnValidationError?: boolean;
}

/**
 * Базовый абстрактный класс для всех LLM провайдеров.
 * Предоставляет retry + timeout логику.
 * Конкретные провайдеры (Gemini, Ollama) наследуют этот класс.
 */
abstract class AbstractLlmService {
	/** Дефолтная конфигурация */
	private static readonly DEFAULT_RESILIENCE_CONFIG: ResilienceConfig = {
		retry: {
			maxAttempts: 3,
			initialDelayMs: 1000,
			maxDelayMs: 8000,
			backoffMultiplier: 2
		},
		timeout: {
			durationMs: 60000
		}
	};

	protected readonly logger = new Logger(this.constructor.name);
	protected readonly llmLogger = llmLogger;
	protected readonly resilienceConfig: ResilienceConfig;

	constructor(config: ResilienceConfig = AbstractLlmService.DEFAULT_RESILIENCE_CONFIG) {
		this.resilienceConfig = config;
	}

	/**
	 * Генерирует саммари для батча страниц за один вызов LLM
	 */
	abstract generateBatchSummaries(pages: ProcessedPage[]): Promise<string[]>;

	/**
	 * Генерирует общее описание сайта на основе всех саммари страниц
	 */
	abstract generateDescription(pages: ProcessedPage[]): Promise<string>;

	/**
	 * Выполнение LLM операции с retry и timeout
	 * @param fn - Функция вызова LLM API (принимает промпт, возвращает raw JSON строку)
	 * @param options - Настройки retry, timeout, валидации
	 * @returns Распарсенный и валидированный результат
	 */
	protected async withResilience<T>(
		fn: (currentPrompt: string) => Promise<string>,
		options: ResilienceOptions
	): Promise<T> {
		const {
			initialPrompt,
			operationName,
			validation = {},
			retryOnValidationError = true
		} = options;

		const { maxAttempts, initialDelayMs, maxDelayMs, backoffMultiplier } = this.resilienceConfig.retry;
		const { durationMs: timeoutMs } = this.resilienceConfig.timeout;

		let currentPrompt = initialPrompt;
		let lastError: Error | null = null;

		// Retry loop
		for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber++) {
			try {
				this.logger.debug(`${operationName}: attempt ${attemptNumber}/${maxAttempts}`);

				// Вызов LLM API с timeout
				const responseString = await this.executeWithTimeout(
					() => fn(currentPrompt),
					timeoutMs,
					`${operationName} timed out after ${timeoutMs}ms`
				);

				// Парсинг JSON
				const parsed = this.parseJsonResponse<T>(responseString, attemptNumber);

				// Валидация
				this.validateResponse(parsed, validation, attemptNumber);

				// Успех
				this.logger.debug(`${operationName}: success on attempt ${attemptNumber}`);
				return parsed;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));

				// Проверяем, является ли это ошибкой валидации
				const isValidationError = error instanceof LlmJsonValidationException
					|| error instanceof LlmResponseCountMismatchException
					|| error instanceof LlmInvalidSummaryFieldException;

				// Если это validation error и retry включен - пробуем еще раз
				if (isValidationError && retryOnValidationError && attemptNumber < maxAttempts) {
					const message = `${operationName}: validation failed on attempt ${attemptNumber}: ${lastError.message}`;
					this.logger.warn(message);

					// Модифицируем промпт для retry
					currentPrompt = this.buildRetryPrompt(initialPrompt, error, attemptNumber);

					// Экспоненциальная задержка перед retry
					const delayMs = Math.min(
						initialDelayMs * Math.pow(backoffMultiplier, attemptNumber - 1),
						maxDelayMs
					);

					this.logger.debug(`${operationName}: retrying after ${delayMs}ms`);
					await this.sleep(delayMs);

					continue; // Следующая попытка
				}

				// Не валидация или retry отключен - пробрасываем ошибку
				throw error;
			}
		}

		// Все попытки исчерпаны
		this.logger.error(`${operationName}: all ${maxAttempts} attempts failed`);
		throw lastError || new Error(`${operationName}: all attempts failed`);
	}

	/**
	 * Выполнение async операции с timeout
	 */
	private async executeWithTimeout<T>(
		fn: () => Promise<T>,
		timeoutMs: number,
		timeoutMessage: string
	): Promise<T> {
		return Promise.race([
			fn(),
			new Promise<T>((_, reject) => {
				setTimeout(() => {
					reject(new Error(timeoutMessage));
				}, timeoutMs);
			})
		]);
	}

	/**
	 * Валидация результата на основе конфига
	 */
	private validateResponse<T>(
		result: T,
		validation: ValidationConfig,
		attemptNumber: number
	): void {
		const { expectedCount, requireSummaryFields, requireDescriptionField } = validation;

		// Проверка количества элементов
		if (expectedCount !== undefined) {
			if (!Array.isArray(result)) {
				throw new LlmJsonValidationException(
					'Expected array result',
					result,
					attemptNumber
				);
			}

			if (result.length !== expectedCount) {
				throw new LlmResponseCountMismatchException(
					`Expected ${expectedCount} items, got ${result.length}`,
					expectedCount,
					result.length,
					result,
					attemptNumber
				);
			}
		}

		// Проверка полей summary в массиве
		if (requireSummaryFields) {
			if (!Array.isArray(result)) {
				throw new LlmJsonValidationException(
					'Expected array for summary validation',
					result,
					attemptNumber
				);
			}

			result.forEach((item, index) => {
				if (typeof item !== 'object' || item === null) {
					throw new LlmInvalidSummaryFieldException(
						`Item at index ${index} is not an object`,
						index,
						item,
						attemptNumber
					);
				}

				const obj = item as Record<string, unknown>;
				if (!obj.summary || typeof obj.summary !== 'string' || obj.summary.trim() === '') {
					throw new LlmInvalidSummaryFieldException(
						`Item at index ${index} has invalid summary field`,
						index,
						item,
						attemptNumber
					);
				}
			});
		}

		// Проверка поля description в объекте
		if (requireDescriptionField) {
			if (typeof result !== 'object' || result === null) {
				throw new LlmJsonValidationException(
					'Expected object for description validation',
					result,
					attemptNumber
				);
			}

			const obj = result as Record<string, unknown>;
			if (!obj.description || typeof obj.description !== 'string' || obj.description.trim() === '') {
				throw new LlmJsonValidationException(
					'Missing or invalid description field',
					result,
					attemptNumber
				);
			}
		}
	}

	/**
	 * Построение промпта для retry при ошибке валидации
	 */
	private buildRetryPrompt(
		originalPrompt: string,
		error: unknown,
		attemptNumber: number
	): string {
		let errorDetails = '';

		if (error instanceof LlmResponseCountMismatchException) {
			errorDetails = `Count mismatch: expected ${error.expected}, got ${error.received}`;
		} else if (error instanceof LlmInvalidSummaryFieldException) {
			errorDetails = `Invalid summary field at index ${error.summaryIndex}`;
		} else if (error instanceof LlmJsonValidationException) {
			errorDetails = `Validation error: ${error.message}`;
		} else if (error instanceof Error) {
			errorDetails = error.message;
		}

		return `**CRITICAL ERROR - Attempt ${attemptNumber}**
Your previous response did not match the required format.

Error: ${errorDetails}

Requirements:
1. Return ONLY valid JSON matching the exact structure specified below
2. NO markdown code blocks (no \`\`\`json)
3. NO additional text or explanations
4. Ensure all required fields are present and have correct types

Original request:
${originalPrompt}`;
	}

	/**
	 * Задержка выполнения
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Попытка парсинга JSON с fallback на извлечение из markdown
	 * Бросает LlmJsonValidationException если парсинг невозможен
	 */
	protected parseJsonResponse<T>(response: string, attemptNumber: number): T {
		try {
			return JSON.parse(response) as T;
		} catch {
			// Пробуем извлечь из markdown блока
			try {
				const extracted = this.extractJsonFromMarkdown(response);
				return JSON.parse(extracted) as T;
			} catch (error) {
				// Парсинг не удался - бросаем LlmJsonValidationException для retry
				const errorMessage = error instanceof Error ? error.message : String(error);
				throw new LlmJsonValidationException(
					`Failed to parse LLM response as JSON: ${errorMessage}. Response: ${response.substring(0, 200)}...`,
					response,
					attemptNumber
				);
			}
		}
	}

	/**
	 * Извлечение JSON из markdown кодового блока (если LLM вернул ```json...```)
	 */
	protected extractJsonFromMarkdown(text: string): string {
		const jsonBlockMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
		if (jsonBlockMatch) {
			return jsonBlockMatch[1].trim();
		}
		return text.trim();
	}
}

export { AbstractLlmService };
