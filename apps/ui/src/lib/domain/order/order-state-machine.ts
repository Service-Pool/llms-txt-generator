import { OrderStatus, type OrderResponseDto } from '@api/shared';
import { ORDER_ACTION_BUTTONS } from '$lib/components/order-actions.config';
import { StepActionIdEnum } from './step-action-id.enum';
import type { StepDescriptorInterface, StepperStateInterface, TransitionDescriptorInterface } from './types';

/**
 * OrderStateMachine
 *
 * Единый источник истины для бизнес-логики заказов.
 * Определяет доступные переходы (transitions) и состояние stepper.
 *
 * ПРАВИЛА:
 * ✅ Чистая функция - не зависит от UI
 * ✅ Не знает про модалки, loading states, user interactions
 * ✅ Только про статус заказа → доступные действия
 * ✅ Только про статус заказа → состояние stepper
 * ❌ НЕ импортирует компоненты
 * ❌ НЕ содержит UI-логику
 */
class OrderStateMachine {
	/**
	 * Получить доступные переходы для заказа
	 *
	 * Переход доступен если:
	 * 1. Хотя бы одно из его hateoasActions есть в order._links (backend availability)
	 * 2. Переход не отключён во frontend конфигурации (config.enabled !== false)
	 *
	 * @param order - Заказ
	 * @returns Массив доступных переходов
	 */
	static getAvailableTransitions(order: OrderResponseDto): TransitionDescriptorInterface[] {
		if (!order._links) {
			return [];
		}

		const availableActionIds = Object.keys(order._links);

		return ORDER_ACTION_BUTTONS.filter((config) => {
			// Проверяем наличие хотя бы одного HATEOAS действия
			const hasHateoasAction = config.hateoasActions.some(action => availableActionIds.includes(action));

			// Проверяем что действие не отключено во frontend конфигурации
			const isEnabledInConfig = config.enabled !== false;

			return hasHateoasAction && isEnabledInConfig;
		});
	}

	/**
	 * Получить состояние stepper для заказа
	 *
	 * Состояние включает:
	 * 1. Список шагов (динамический - исключается Payment если priceTotal === 0)
	 * 2. Максимально допустимый шаг на основе статуса заказа
	 * 3. Текущий шаг (по умолчанию = maxAllowedStep)
	 * 4. ID действия для текущего шага
	 *
	 * @param order - Заказ
	 * @param currentStep - Текущий выбранный шаг (опционально, по умолчанию = maxAllowedStep)
	 * @returns Состояние stepper
	 */
	static getStepperState(order: OrderResponseDto, currentStep?: number): StepperStateInterface {
		// 1. Вычисляем динамический список шагов
		const allSteps: Omit<StepDescriptorInterface, 'id'>[] = [
			{ label: 'Configure', description: 'Select AI model', actionId: StepActionIdEnum.Calculate },
			{ label: 'Payment', description: 'Process payment', actionId: StepActionIdEnum.Payment },
			{ label: 'Generate', description: 'Run generation', actionId: StepActionIdEnum.Run },
			{ label: 'Complete', description: 'Download results', actionId: StepActionIdEnum.Download }
		];

		// Исключаем Payment если цена 0
		const steps: StepDescriptorInterface[] = allSteps
			.filter(step => !(step.actionId === StepActionIdEnum.Payment && order.attributes.priceTotal === 0))
			.map((step, index) => ({ ...step, id: index + 1 }));

		// 2. Вычисляем максимально допустимый шаг на основе статуса заказа
		const maxAllowedStep = this._calculateMaxAllowedStep(order, steps);

		// 3. Определяем текущий шаг
		const current = currentStep ?? maxAllowedStep;

		// 4. Определяем ID действия для текущего шага
		const currentStepActionId = steps.find(s => s.id === current)?.actionId;

		return {
			steps,
			currentStep: current,
			maxAllowedStep,
			currentStepActionId
		};
	}

	/**
	 * Вычислить максимально допустимый шаг на основе статуса заказа
	 *
	 * Логика:
	 * - CREATED && !hasModel → 'calculate'
	 * - CREATED || CALCULATED → 'payment' (или 'run' если priceTotal === 0)
	 * - PAID || QUEUED → 'run'
	 * - PROCESSING, COMPLETED, FAILED → 'download'
	 *
	 * @param order - Заказ
	 * @param steps - Список шагов
	 * @returns Номер максимально допустимого шага (1-based)
	 */
	private static _calculateMaxAllowedStep(order: OrderResponseDto, steps: StepDescriptorInterface[]): number {
		const status = order.attributes.status;
		const hasModel = !!order.attributes.currentAiModel;
		const isFree = order.attributes.priceTotal === 0;

		// Определяем целевое действие на основе статуса
		let targetActionId: StepActionIdEnum;

		if (status === OrderStatus.CREATED && !hasModel) {
			targetActionId = StepActionIdEnum.Calculate;
		} else if (
			status === OrderStatus.CREATED
			|| status === OrderStatus.CALCULATED
			|| status === OrderStatus.PENDING_PAYMENT
			|| status === OrderStatus.PAYMENT_FAILED
		) {
			// После выбора модели: payment или run (если цена = 0)
			targetActionId = isFree ? StepActionIdEnum.Run : StepActionIdEnum.Payment;
		} else if (status === OrderStatus.PAID || status === OrderStatus.QUEUED) {
			targetActionId = StepActionIdEnum.Run;
		} else {
			// PROCESSING, COMPLETED, FAILED, CANCELLED, REFUNDED
			targetActionId = StepActionIdEnum.Download;
		}

		// Находим номер шага по actionId
		const foundStep = steps.find(s => s.actionId === targetActionId);

		// Если не нашли (не должно случиться), возвращаем первый шаг
		return foundStep?.id ?? 1;
	}
}

export { OrderStateMachine };
