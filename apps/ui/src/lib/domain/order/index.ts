/**
 * Domain Layer - Order
 *
 * Единый источник истины для бизнес-логики заказов.
 * Определяет доступные переходы (transitions) и состояние stepper.
 */
export { OrderStateMachine } from './order-state-machine';
export { StepActionIdEnum } from './step-action-id.enum';
export type {
	TransitionDescriptorInterface,
	StepDescriptorInterface,
	StepperStateInterface,
	ActionRendererPropsInterface
} from './types';
