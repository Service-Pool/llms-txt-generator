/**
 * Domain Layer - Order
 *
 * Единый источник истины для бизнес-логики заказов.
 * Определяет доступные переходы (transitions) и состояние stepper.
 */
export { OrderStatusMachine } from './order-status-machine';
export { StepActionIdEnum } from './step-action-id.enum';
export type {
	TransitionDescriptorInterface,
	StepDescriptorInterface,
	StepperStateInterface,
	ActionRendererPropsInterface
} from './types';
