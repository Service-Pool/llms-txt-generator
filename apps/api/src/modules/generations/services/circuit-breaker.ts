import { Logger } from '@nestjs/common';
import { LlmBaseException } from '@/exceptions/llm-base.exception';

/**
 * Состояния circuit breaker
 */
enum CircuitState {
	CLOSED = 'CLOSED', // Работает нормально
	OPEN = 'OPEN', // Блокирует запросы
	HALF_OPEN = 'HALF_OPEN' // Пробует один запрос
}

/**
 * Простой circuit breaker для защиты от каскадных сбоев LLM сервиса.
 *
 * Игнорирует ошибки валидации (они обрабатываются retry логикой).
 * Открывается только на реальных API/сетевых ошибках.
 */
class SimpleCircuitBreaker {
	private state: CircuitState = CircuitState.CLOSED;
	private failureCount = 0;
	private nextAttemptTime = 0;
	private readonly logger = new Logger('CircuitBreaker');

	constructor(
		private readonly threshold: number, // Сколько ошибок подряд открывают circuit
		private readonly timeoutMs: number // Через сколько пробовать снова
	) { }

	/**
	 * Выполнить функцию через circuit breaker
	 */
	async execute<T>(fn: () => Promise<T>): Promise<T> {
		// Проверяем состояние circuit
		if (this.state === CircuitState.OPEN) {
			const now = Date.now();
			if (now < this.nextAttemptTime) {
				// Circuit открыт и время не истекло - сразу отклоняем
				throw new Error('Circuit breaker is OPEN - LLM service unavailable');
			}
			// Время истекло - переходим в HALF_OPEN для пробного запроса
			this.state = CircuitState.HALF_OPEN;
			this.logger.warn('Circuit breaker transitioning to HALF_OPEN');
		}

		try {
			const result = await fn();
			// Успех - сбрасываем счетчик и закрываем circuit
			this.onSuccess();
			return result;
		} catch (error) {
			// Ошибка - проверяем нужно ли открыть circuit
			this.onFailure(error);
			throw error;
		}
	}

	/**
	 * Обработка успешного запроса
	 */
	private onSuccess(): void {
		if (this.state === CircuitState.HALF_OPEN) {
			this.logger.log('Circuit breaker test request succeeded - closing circuit');
		}
		this.failureCount = 0;
		this.state = CircuitState.CLOSED;
	}

	/**
	 * Обработка ошибки
	 */
	private onFailure(error: unknown): void {
		// Игнорируем валидационные ошибки - они не должны открывать circuit
		if (error instanceof LlmBaseException) {
			return; // Не учитываем валидационные ошибки
		}

		// Это API/сетевая ошибка - учитываем
		this.failureCount++;

		if (this.state === CircuitState.HALF_OPEN) {
			// Пробный запрос failed - снова открываем circuit
			this.openCircuit();
		} else if (this.failureCount >= this.threshold) {
			// Достигли threshold - открываем circuit
			this.openCircuit();
		}
	}

	/**
	 * Открыть circuit
	 */
	private openCircuit(): void {
		this.state = CircuitState.OPEN;
		this.nextAttemptTime = Date.now() + this.timeoutMs;
		this.logger.error(`Circuit breaker OPENED after ${this.failureCount} failures. Will retry in ${this.timeoutMs}ms`);
	}
}

export { SimpleCircuitBreaker };
