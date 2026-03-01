import type { HateoasAction } from '@api/shared';
import type { Component } from 'svelte';
import type { VariantProps } from 'tailwind-variants';
import { button } from 'flowbite-svelte';
import { StepActionIdEnum } from './step-action-id.enum';

type ButtonColor = NonNullable<VariantProps<typeof button>['color']>;

/**
 * Описатель перехода (transition) для заказа
 * Это domain-уровень абстракция над UI-конфигурацией действий
 */
interface TransitionDescriptorInterface {
	/**
	 * Уникальный идентификатор перехода
	 */
	id: StepActionIdEnum;

	/**
	 * Иконка для UI (Svelte component)
	 */
	icon: Component;

	/**
	 * Основная метка (для кнопок, степпера)
	 */
	label: string;

	/**
	 * Альтернативная метка (например, "Set Model" → "Update Model")
	 */
	labelAlternative?: string;

	/**
	 * Описание действия (для tooltips, подсказок)
	 */
	description?: string;

	/**
	 * Цвет для UI элементов
	 */
	color: ButtonColor;

	/**
	 * HATEOAS действия, соответствующие этому переходу
	 * Переход доступен, если хотя бы одно из этих действий есть в order._links
	 */
	hateoasActions: HateoasAction[];
}

/**
 * Описатель шага для stepper UI
 */
interface StepDescriptorInterface {
	/**
	 * Номер шага (1-based)
	 */
	id: number;

	/**
	 * Метка шага (отображается в stepper)
	 */
	label: string;

	/**
	 * Описание шага (отображается под меткой)
	 */
	description: string;

	/**
	 * Идентификатор действия, соответствующего этому шагу
	 */
	actionId: StepActionIdEnum;
}

/**
 * Состояние stepper для заказа
 */
interface StepperStateInterface {
	/**
	 * Список шагов (динамический, может исключать Payment если priceTotal === 0)
	 */
	steps: StepDescriptorInterface[];

	/**
	 * Текущий шаг (1-based)
	 */
	currentStep: number;

	/**
	 * Предпочтительный шаг для данного статуса заказа (для синхронизации UI)
	 * Используется OrderStepper чтобы автоматически переключаться при изменении статуса
	 */
	preferredStepId: number;

	/**
	 * ID действия для текущего шага
	 */
	currentStepActionId: StepActionIdEnum | undefined;

	/**
	 * Шаги на которые можно перейти кликом в stepper (навигация)
	 */
	navigableStepIds: number[];
}

/**
 * Props для Action Renderer компонентов
 * Используется для типизации renderer prop в Action компонентах
 */

interface ActionRendererPropsInterface {
	/**
	 * Transition descriptor from OrderStatusMachine
	 */
	transition: TransitionDescriptorInterface;

	/**
	 * Text on button
	 */
	label: string;

	/**
	 * Click handler (может принимать MouseEvent для совместимости с event handlers)
	 */
	onclick: ((event?: MouseEvent) => void | Promise<void>) | (() => void);

	/**
	 * CSS classes
	 */
	class?: string;

	/**
	 * Disabled state
	 */
	disabled?: boolean;

	/**
	 * Loading state
	 */
	loading?: boolean;

	/**
	 * Button size (for renderers that support it)
	 */
	size?: NonNullable<VariantProps<typeof button>['size']>;
}

export {
	type StepDescriptorInterface,
	type StepperStateInterface,
	type ActionRendererPropsInterface,
	type TransitionDescriptorInterface
};
