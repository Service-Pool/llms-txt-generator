import { OrderStatus, type OrderResponseDto } from '@api/shared';
import { configService } from '$lib/services/config.service';
import { StepActionIdEnum } from './step-action-id.enum';
import type { StepDescriptorInterface, StepperStateInterface, TransitionDescriptorInterface } from './types';

// ─── Step definitions ────────────────────────────────────────────────────────
// Полный список шагов stepper в порядке отображения.
// Каждый шаг идентифицируется actionId, а не числовым ID -
// числовые ID назначаются динамически после фильтрации видимых шагов.

const ALL_STEPS: Omit<StepDescriptorInterface, 'id'>[] = [
	{ label: 'Configure', description: 'Select AI model', actionId: StepActionIdEnum.Calculate },
	{ label: 'Payment', description: 'Process payment', actionId: StepActionIdEnum.Payment },
	{ label: 'Generate', description: 'Run generation', actionId: StepActionIdEnum.Run },
	{ label: 'Complete', description: 'Download results', actionId: StepActionIdEnum.Download }
];

// ─── Per-status configuration ─────────────────────────────────────────────────
// Для каждого статуса заказа определяем:
//   preferredActionId  - какой шаг активен по умолчанию (кнопка действия активна только на нём)
//   navigableActionIds - на какие шаги пользователь может кликнуть в stepper для навигации
//
// Шаги показываются всегда все (Configure → Payment → Generate → Complete),
// кроме Payment который скрывается если priceTotal === 0.

type StatusStepConfig = {
	preferredActionId: (order: OrderResponseDto) => StepActionIdEnum;
	navigableActionIds: StepActionIdEnum[]; // шаги на которые можно перейти кликом в stepper
	buttonEnabled?: boolean; // активна ли кнопка действия (default: true)
};

const STATUS_CONFIG: Record<OrderStatus, StatusStepConfig> = {
	[OrderStatus.CREATED]: {
		preferredActionId: () => StepActionIdEnum.Calculate,
		navigableActionIds: [StepActionIdEnum.Calculate]
	},
	[OrderStatus.CALCULATED]: {
		preferredActionId: order => (order.attributes.priceTotal ?? 0) > 0
			? StepActionIdEnum.Payment
			: StepActionIdEnum.Run,
		navigableActionIds: [StepActionIdEnum.Calculate]
	},
	[OrderStatus.PENDING_PAYMENT]: {
		preferredActionId: () => StepActionIdEnum.Payment,
		navigableActionIds: [StepActionIdEnum.Calculate, StepActionIdEnum.Payment]
	},
	[OrderStatus.PAYMENT_FAILED]: {
		preferredActionId: () => StepActionIdEnum.Payment,
		navigableActionIds: [StepActionIdEnum.Calculate, StepActionIdEnum.Payment]
	},
	[OrderStatus.PAID]: {
		preferredActionId: () => StepActionIdEnum.Run,
		navigableActionIds: [StepActionIdEnum.Run]
	},
	[OrderStatus.QUEUED]: {
		preferredActionId: () => StepActionIdEnum.Run,
		navigableActionIds: [],
		buttonEnabled: false // генерация уже запущена, повторный запуск невозможен
	},
	[OrderStatus.PROCESSING]: {
		preferredActionId: () => StepActionIdEnum.Run,
		navigableActionIds: [],
		buttonEnabled: false // генерация уже запущена, повторный запуск невозможен
	},
	[OrderStatus.FAILED]: {
		preferredActionId: () => StepActionIdEnum.Run,
		navigableActionIds: [StepActionIdEnum.Run]
	},
	[OrderStatus.COMPLETED]: {
		preferredActionId: () => StepActionIdEnum.Download,
		navigableActionIds: [StepActionIdEnum.Download]
	},
	[OrderStatus.CANCELLED]: {
		preferredActionId: () => StepActionIdEnum.Calculate,
		navigableActionIds: [],
		buttonEnabled: false // терминальный статус, действия недоступны
	},
	[OrderStatus.REFUNDED]: {
		preferredActionId: () => StepActionIdEnum.Run,
		navigableActionIds: [],
		buttonEnabled: false // терминальный статус, возврат средств выполнен
	}
};

// ─── OrderStatusMachine ───────────────────────────────────────────────────────

class OrderStatusMachine {
	/**
	 * Доступные переходы для заказа — те, у которых хотя бы одно
	 * hateoasActions-действие присутствует в order._links.
	 */
	static getAvailableTransitions(order: OrderResponseDto): TransitionDescriptorInterface[] {
		if (!order._links) return [];

		const availableLinks = new Set(Object.keys(order._links));

		return configService.orderActions.filter(action =>
			action.enabled !== false
			&& action.hateoasActions.some(link => availableLinks.has(link)));
	}

	/**
	 * Состояние stepper для заказа.
	 *
	 * @param order       - данные заказа
	 * @param currentStep - шаг выбранный пользователем (1-based); если не передан — preferredStep
	 */
	static getStepperState(order: OrderResponseDto, currentStep?: number): StepperStateInterface {
		const status = order.attributes.status as OrderStatus;
		const config = STATUS_CONFIG[status];

		if (!config) {
			throw new Error(`OrderStatusMachine: no config for status "${status}"`);
		}

		// 1. Все шаги всегда видны, кроме Payment если priceTotal === 0
		const steps: StepDescriptorInterface[] = ALL_STEPS
			.filter(step => !(step.actionId === StepActionIdEnum.Payment && (order.attributes.priceTotal ?? 0) === 0))
			.map((step, index) => ({ ...step, id: index + 1 }));

		// 2. preferredStep — шаг, который должен быть активен при открытии
		const preferredActionId = config.preferredActionId(order);
		const preferredStep = steps.find(s => s.actionId === preferredActionId);
		const preferredStepId = preferredStep?.id ?? 1;

		// 3. currentStep — явно выбранный пользователем или preferred
		const current = currentStep ?? preferredStepId;

		// 4. navigableStepIds — шаги на которые можно перейти кликом в stepper
		const navigableStepIds = config.navigableActionIds
			.map(actionId => steps.find(s => s.actionId === actionId)?.id)
			.filter((id): id is number => id !== undefined);

		// 5. currentStepActionId — действие для текущего шага
		const currentStepActionId = steps.find(s => s.id === current)?.actionId;

		// 6. isButtonEnabled — разрешена ли кнопка для данного статуса заказа
		//    false для статусов где действие уже выполняется (QUEUED, PROCESSING)
		//    Не учитывает текущий шаг навигации — это делает компонент через $derived
		const isButtonEnabled = config.buttonEnabled !== false;

		return {
			steps,
			currentStep: current,
			preferredStepId,
			currentStepActionId,
			navigableStepIds,
			isButtonEnabled
		};
	}
}

export { OrderStatusMachine };
