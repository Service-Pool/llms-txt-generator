<script lang="ts">
	import type { OrderResponseDto } from '@api/shared';
	import type { Component } from 'svelte';
	import type { ActionRendererPropsInterface } from '$lib/domain/order';
	import { DetailedStepper, Card, P } from 'flowbite-svelte';
	import { OrderStateMachine, StepActionIdEnum } from '$lib/domain/order';
	import { CalculateAction, PaymentAction, RunAction, DownloadAction } from '$lib/components/order';
	import { getActionConfig } from '$lib/components/order-actions.config';

	interface Props {
		order: OrderResponseDto;
		renderer: Component<ActionRendererPropsInterface>;
		onOpenPaymentModal?: (clientSecret: string, publishableKey: string) => void;
		onOpenCalculateModal?: () => void;
		class?: string;
		allowAllSteps?: boolean;
	}

	let {
		order,
		renderer,
		onOpenPaymentModal,
		onOpenCalculateModal,
		class: className = '',
		allowAllSteps = true
	}: Props = $props();

	// Get stepper state from domain
	const stepperState = $derived(OrderStateMachine.getStepperState(order));

	// Current step tracking (user can manually switch steps)
	let current = $state(1); // Will be synced in $effect
	let prevMaxAllowed = $state(1);
	let prevStepsCount = $state(0);

	// Sync current with maxAllowedStep when order changes
	$effect(() => {
		const stepsCount = stepperState.steps.length;

		// Initialize on first run
		if (prevStepsCount === 0) {
			current = stepperState.currentStep;
			prevMaxAllowed = stepperState.maxAllowedStep;
			prevStepsCount = stepsCount;
			return;
		}

		// If steps structure changed (Payment added/removed)
		if (stepsCount !== prevStepsCount) {
			current = stepperState.maxAllowedStep;
			prevMaxAllowed = stepperState.maxAllowedStep;
			prevStepsCount = stepsCount;
		}
		// If maxAllowedStep increased (order status updated)
		else if (stepperState.maxAllowedStep > prevMaxAllowed) {
			current = stepperState.maxAllowedStep;
			prevMaxAllowed = stepperState.maxAllowedStep;
		}
		// Update prevMaxAllowed even if not advanced
		else if (stepperState.maxAllowedStep !== prevMaxAllowed) {
			prevMaxAllowed = stepperState.maxAllowedStep;
		}
		// Validation: don't allow going further than allowed
		if (current > stepperState.maxAllowedStep && !allowAllSteps) {
			current = stepperState.maxAllowedStep;
		}
	});

	// Get current step state
	const currentStepState = $derived(OrderStateMachine.getStepperState(order, current));
	const currentStepActionId = $derived(currentStepState.currentStepActionId);

	// Get transition for current step action
	const transitions = $derived(OrderStateMachine.getAvailableTransitions(order));
	const currentTransition = $derived(transitions.find((t) => t.id === currentStepActionId));

	// For unavailable steps, get config from static config (not HATEOAS)
	const fallbackConfig = $derived(getActionConfig(currentStepActionId!));

	const btnMinWidth = 'min-w-35';
</script>

<!--
  OrderStepper

  ПРАВИЛА:
  ✅ Композитный компонент - объединяет DetailedStepper + Action компонент
  ✅ Использует OrderStateMachine для получения stepper state
  ✅ Рендерит Action компонент для текущего шага с переданным renderer
  ✅ НЕ ПРОВЕРЯЕТ enabled (transition УЖЕ доступен из domain)
  ✅ Синхронизирует текущий шаг с maxAllowedStep при обновлении заказа
  ❌ НЕ знает о конкретном renderer (передаётся снаружи)

  Props:
  - order: OrderResponseDto - данные заказа
  - renderer: Component - компонент для отображения (обычно ActionButton)
  - class: string - CSS classes для root
  - allowAllSteps: boolean - разрешить все шаги (skip validation)
-->
<div class="order-action-stepper space-y-2">
	<!-- Stepper -->
	<Card class="p-6 max-w-none {className}">
		<DetailedStepper class="justify-between" steps={stepperState.steps} showCheckmarkForCompleted={true} bind:current />
	</Card>

	<!-- Action Button - ONE button for current step -->
	{#if currentStepActionId && (currentTransition || fallbackConfig)}
		<Card class="max-w-none py-1 pt-13 pb-5 {className}">
			<div class="flex justify-center gap-2">
				{#if currentStepActionId === StepActionIdEnum.Calculate}
					<CalculateAction
						transition={(currentTransition || fallbackConfig)!}
						{renderer}
						{onOpenCalculateModal}
						class={btnMinWidth}
						disabled={!currentTransition || current > stepperState.maxAllowedStep}
					/>
				{:else if currentStepActionId === StepActionIdEnum.Payment}
					<PaymentAction
						{order}
						transition={(currentTransition || fallbackConfig)!}
						{renderer}
						{onOpenPaymentModal}
						class={btnMinWidth}
						disabled={!currentTransition || current > stepperState.maxAllowedStep}
					/>
				{:else if currentStepActionId === StepActionIdEnum.Run}
					<RunAction
						{order}
						transition={(currentTransition || fallbackConfig)!}
						{renderer}
						class={btnMinWidth}
						disabled={!currentTransition || current > stepperState.maxAllowedStep}
					/>
				{:else if currentStepActionId === StepActionIdEnum.Download}
					<DownloadAction
						{order}
						transition={(currentTransition || fallbackConfig)!}
						{renderer}
						class={btnMinWidth}
						disabled={!currentTransition || current > stepperState.maxAllowedStep}
					/>
				{/if}
			</div>

			<div class="h-8">
				{#if current > stepperState.maxAllowedStep}
					<P align="center" height="8" size="xs" space="normal" italic>Complete previous step first</P>
				{:else if !currentTransition}
					<P align="center" height="8" size="xs" space="normal" italic>Step is already completed</P>
				{/if}
			</div>
		</Card>
	{/if}
</div>

<style>
	@reference "tailwindcss";

	/* DetailedStepper - override primary colors to purple */
	.order-action-stepper :global(span.border-primary-600.bg-primary-600) {
		@apply border-slate-800 bg-slate-800;
	}

	:global(.dark) .order-action-stepper :global(span.dark\:border-primary-500.dark\:bg-primary-500) {
		@apply border-sky-700 bg-sky-700;
	}
</style>
