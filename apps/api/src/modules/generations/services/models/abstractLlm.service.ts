import { Logger } from '@nestjs/common';
import { ProcessedPage } from '@/modules/generations/models/processed-page.model';
import {
	retry,
	circuitBreaker,
	timeout,
	wrap,
	handleAll,
	IPolicy,
	ExponentialBackoff,
	ConsecutiveBreaker,
	TimeoutStrategy
} from 'cockatiel';
import { LlmJsonValidationException } from '@/exceptions/llm-json-validation.exception';

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
	validator?: (result: T) => boolean;
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
	 * @param fn - Async операция для выполнения (принимает текущий промпт и номер попытки)
	 * @param options - Опции resilience (validator, retry settings, initial prompt)
	 * @returns Результат операции
	 */
	protected async withResilience<T>(
		fn: (currentPrompt: string, attemptNumber: number) => Promise<T>,
		options: ResilienceOptions<T> = {}
	): Promise<T> {
		const { validator, retryOnValidationError = true, operationName = 'LLM operation', initialPrompt = '' } = options;

		let lastValidationError: LlmJsonValidationException | null = null;
		let attemptNumber = 0;
		let currentPrompt = initialPrompt;

		const executeWithValidation = async (): Promise<T> => {
			attemptNumber++;

			try {
				const result = await this.policy.execute(() => fn(currentPrompt, attemptNumber)) as T;

				if (validator && !validator(result)) {
					const error = new LlmJsonValidationException(
						`${operationName} returned invalid response`,
						result,
						attemptNumber
					);
					lastValidationError = error;

					if (retryOnValidationError) {
						const msg = `Validation failed for ${operationName} (attempt ${attemptNumber}): ${error.message}`;
						this.logger.warn(msg);
						// Модифицируем промпт для следующей попытки
						if (initialPrompt) {
							currentPrompt = this.buildRetryPrompt(initialPrompt, result, attemptNumber);
						}
						throw error;
					} else {
						this.logger.error(`Validation failed for ${operationName}, but retries disabled`);
						throw error;
					}
				}

				return result;
			} catch (error) {
				if (error instanceof LlmJsonValidationException) {
					throw error;
				}

				this.logger.error(`${operationName} failed (attempt ${attemptNumber}):`, error);
				throw error;
			}
		};

		try {
			return await executeWithValidation();
		} catch (error) {
			if (lastValidationError) {
				this.logger.error(
					`All retry attempts exhausted for ${operationName}. Last validation error:`,
					lastValidationError
				);
			}
			throw error;
		}
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
Your previous response was invalid. You MUST return ONLY a valid JSON array of strings.

Invalid response:
${JSON.stringify(invalidResponse, null, 2)}

Requirements:
1. Return ONLY a JSON array: ["summary1", "summary2", ...]
2. NO markdown code blocks (no \`\`\`json)
3. NO additional text or explanations
4. Each summary must be a non-empty string

Original request:
${originalPrompt}`;

		return errorMessage;
	}

	/**
	 * Построение композитной resilience политики (retry + circuit breaker + timeout)
	 */
	private buildResiliencePolicy(): IPolicy {
		const { retry: retryConfig, circuitBreaker: cbConfig, timeout: timeoutConfig } = this.resilienceConfig;

		const retryPolicy = retry(handleAll, {
			maxAttempts: retryConfig.maxAttempts,
			backoff: new ExponentialBackoff({
				initialDelay: retryConfig.initialDelayMs,
				maxDelay: retryConfig.maxDelayMs,
				exponent: retryConfig.backoffMultiplier
			})
		});

		const breakerPolicy = circuitBreaker(handleAll, {
			halfOpenAfter: cbConfig.halfOpenAfterMs,
			breaker: new ConsecutiveBreaker(cbConfig.failureThreshold)
		});

		const timeoutPolicy = timeout(timeoutConfig.durationMs, TimeoutStrategy.Cooperative);

		return wrap(retryPolicy, breakerPolicy, timeoutPolicy);
	}
}

export { AbstractLlmService };
