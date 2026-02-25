import { Logger } from '@nestjs/common';
import { ProcessedPage } from '@/modules/generations/models/processed-page.model';
import {
	circuitBreaker,
	timeout,
	wrap,
	handleAll,
	handleWhen,
	retry,
	ExponentialBackoff,
	IPolicy,
	ConsecutiveBreaker,
	TimeoutStrategy
} from 'cockatiel';
import { LlmJsonValidationException } from '@/exceptions/llm-json-validation.exception';
import { LlmResponseCountMismatchException } from '@/exceptions/llm-response-count-mismatch.exception';
import { LlmInvalidSummaryFieldException } from '@/exceptions/llm-invalid-summary-field.exception';

/**
 * Конфигурация resilience политик для LLM провайдеров
 */
export interface ResilienceConfig {
	retry: {
		maxAttempts: number;
		initialDelayMs: number;
		maxDelayMs: number;
		backoffMultiplier: number;
	};
	circuitBreaker: {
		halfOpenAfterMs: number;
		failureThreshold: number;
		successThreshold: number;
	};
	timeout: {
		durationMs: number;
	};
}

/**
 * Опции для выполнения операции с resilience
 */
interface ResilienceOptions<T> {
	/**
	 * Pipeline валидаторов для проверки результата.
	 * Каждый валидатор может бросить специфичное исключение:
	 * - LlmResponseCountMismatchException
	 * - LlmInvalidSummaryFieldException
	 * - LlmJsonValidationException
	 * Если валидатор не бросает исключение - результат считается валидным.
	 */
	validators?: Array<(result: T, attemptNumber: number) => void>;
	retryOnValidationError?: boolean;
	operationName?: string;
	initialPrompt?: string;
}

/**
 * Базовый абстрактный класс для всех LLM провайдеров.
 * Предоставляет встроенную resilience логику через Template Method pattern.
 * Конкретные провайдеры (Gemini, Ollama) наследуют этот класс.
 */
abstract class AbstractLlmService {
	/**
	 * Дефолтная конфигурация для LLM операций
	 */
	private static readonly DEFAULT_RESILIENCE_CONFIG: ResilienceConfig = {
		retry: {
			maxAttempts: 3,
			initialDelayMs: 1000,
			maxDelayMs: 8000,
			backoffMultiplier: 2
		},
		circuitBreaker: {
			halfOpenAfterMs: 30000,
			failureThreshold: 5,
			successThreshold: 2
		},
		timeout: {
			durationMs: 60000
		}
	};

	protected readonly logger = new Logger(this.constructor.name);
	protected readonly resilienceConfig: ResilienceConfig;
	protected readonly policy: IPolicy;

	constructor(config: ResilienceConfig = AbstractLlmService.DEFAULT_RESILIENCE_CONFIG) {
		this.resilienceConfig = config;
		this.policy = this.buildResiliencePolicy();
	}

	/**
	 * Генерирует саммари для батча страниц за один вызов LLM
	 * @param pages - Массив страниц с контентом и заголовками
	 * @returns Массив саммари в том же порядке
	 */
	abstract generateBatchSummaries(pages: ProcessedPage[]): Promise<string[]>;

	/**
	 * Генерирует общее описание сайта на основе всех саммари страниц
	 * @param pages - Массив страниц с саммари
	 * @returns Общее описание сайта
	 */
	abstract generateDescription(pages: ProcessedPage[]): Promise<string>;

	/**
	 * Template Method: выполнение операции с retry, circuit breaker и validation.
	 * Subclasses должны использовать этот метод для всех обращений к LLM API.
	 * @param fn - Async операция для выполнения (принимает текущий промпт и номер попытки, возвращает raw JSON строку)
	 * @param options - Опции resilience (validator, retry settings, initial prompt)
	 * @returns Результат операции (распарсенный и валидированный)
	 */
	protected async withResilience<T>(
		fn: (currentPrompt: string, attemptNumber: number) => Promise<string>,
		options: ResilienceOptions<T> = {}
	): Promise<T> {
		const { initialPrompt, validators = [], retryOnValidationError = true, operationName = 'LLM operation' } = options;

		// Мутабельный контекст для передачи между попытками retry
		let attemptNumber = 0;
		let currentPrompt = initialPrompt;

		// Создаём динамический retry policy для validation ошибок (если включено)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let combinedPolicy: IPolicy<any, any> = this.policy; // базовая policy (circuit breaker + timeout)

		if (retryOnValidationError) {
			const retryPolicy = retry(
				// Retry только на validation исключениях
				handleWhen(err =>
					err instanceof LlmJsonValidationException
					|| err instanceof LlmResponseCountMismatchException
					|| err instanceof LlmInvalidSummaryFieldException),
				{
					maxAttempts: this.resilienceConfig.retry.maxAttempts,
					backoff: new ExponentialBackoff({
						initialDelay: this.resilienceConfig.retry.initialDelayMs,
						maxDelay: this.resilienceConfig.retry.maxDelayMs,
						exponent: this.resilienceConfig.retry.backoffMultiplier
					})
				}
			);

			// Настройка callback для retry события
			retryPolicy.onRetry((context) => {
				// Callback вызывается ПЕРЕД следующей попыткой - модифицируем промпт
				const { attempt } = context;

				// Проверяем что это error, а не value (для result-based retry)
				if (!('error' in context)) {
					return;
				}

				const err = context.error;

				if (err instanceof LlmJsonValidationException) {
					this.logger.warn(`Validation failed for ${operationName} (attempt ${attempt}): ${err.message}`);
					currentPrompt = this.buildRetryPrompt(initialPrompt, err.invalidResponse, attempt);
				} else if (err instanceof LlmResponseCountMismatchException) {
					this.logger.warn(`Count mismatch for ${operationName} (attempt ${attempt}): ${err.message}`);
					currentPrompt = this.buildRetryPrompt(initialPrompt, err.invalidResponse, attempt);
				} else if (err instanceof LlmInvalidSummaryFieldException) {
					this.logger.warn(`Invalid summary field at index ${err.summaryIndex} for ${operationName} (attempt ${attempt}): ${err.message}`);
					const retryHint = `\n\nIMPORTANT: Each item in the array MUST have a "summary" field with a string value. Invalid item at index ${err.summaryIndex} in previous attempt.`;
					currentPrompt = initialPrompt + retryHint;
				}

				this.logger.debug(`Retrying ${operationName} after backoff (attempt ${attempt + 1}/${this.resilienceConfig.retry.maxAttempts})`);
			});

			// Композиция: retry -> circuit breaker -> timeout
			combinedPolicy = wrap(retryPolicy, this.policy);
		}

		// Выполняем операцию с validation ВНУТРИ execute - теперь cockatiel обрабатывает retry
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const result = await combinedPolicy.execute(async () => {
			attemptNumber++;

			// Вызываем LLM API
			const responseString = await fn(currentPrompt, attemptNumber);

			// Парсим JSON (может бросить LlmJsonValidationException)
			const parsed = this.parseJsonResponse<T>(responseString, attemptNumber);

			// Прогоняем результат через pipeline валидаторов (могут бросить исключения)
			for (const validator of validators) {
				validator(parsed, attemptNumber);
			}

			// Если дошли сюда - все ок, возвращаем результат
			return parsed;
		});

		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return result;
	}

	/**
	 * Построение промпта для повторной попытки при ошибке валидации
	 * @param originalPrompt - Исходный промпт
	 * @param invalidResponse - Невалидный ответ от LLM
	 * @param attemptNumber - Номер попытки
	 * @returns Модифицированный промпт с описанием ошибки
	 */
	protected buildRetryPrompt(originalPrompt: string, invalidResponse: unknown, attemptNumber: number): string {
		const errorMessage = `
**CRITICAL ERROR - Attempt ${attemptNumber}**: 
Your previous response did not match the required format.

Invalid response received:
${JSON.stringify(invalidResponse, null, 2)}

Requirements:
1. Return ONLY valid JSON matching the exact structure specified in the original request
2. NO markdown code blocks (no \`\`\`json)
3. NO additional text or explanations outside the JSON
4. Ensure all required fields are present and have correct types

Original request:
${originalPrompt}`;

		return errorMessage;
	}

	/**
	 * Построение базовой resilience политики (circuit breaker + timeout)
	 * Retry создаётся динамически в withResilience для контроля над промптом
	 */
	private buildResiliencePolicy(): IPolicy {
		const { circuitBreaker: cbConfig, timeout: timeoutConfig } = this.resilienceConfig;

		const breakerPolicy = circuitBreaker(handleAll, {
			halfOpenAfter: cbConfig.halfOpenAfterMs,
			breaker: new ConsecutiveBreaker(cbConfig.failureThreshold)
		});

		const timeoutPolicy = timeout(timeoutConfig.durationMs, TimeoutStrategy.Cooperative);

		return wrap(breakerPolicy, timeoutPolicy);
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
