<script lang="ts">
	import type { OrderResponseDto } from '@api/shared';
	import type { Component } from 'svelte';
	import type { ActionRendererPropsInterface } from '$lib/domain/order';
	import { DetailedStepper, Card, P } from 'flowbite-svelte';
	import { OrderStatusMachine, StepActionIdEnum } from '$lib/domain/order';
	import { CalculateAction, PaymentAction, RunAction, DownloadAction } from '$lib/components/order';
	import { configService } from '$lib/services/config.service';
	import { OrderStatus } from '@api/shared';

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
	const stepperState = $derived(OrderStatusMachine.getStepperState(order));

	// Current step tracking (user can manually switch steps)
	let current = $state(1); // Will be synced in $effect
	let lastPreferredStepId = $state(1);
	let prevStepsCount = $state(0);

	// Sync current with preferredStepId when order changes
	$effect(() => {
		const { preferredStepId, currentStep, steps } = stepperState;
		const stepsCount = steps.length;

		// Initialize on first run
		if (prevStepsCount === 0) {
			current = currentStep;
			lastPreferredStepId = preferredStepId;
			prevStepsCount = stepsCount;
			return;
		}

		// Determine new current step
		let newCurrent = current;

		if (stepsCount !== prevStepsCount) {
			// Steps structure changed (Payment added/removed)
			newCurrent = preferredStepId;
		} else if (preferredStepId > lastPreferredStepId) {
			// Order advanced to new step
			newCurrent = preferredStepId;
		} else if (preferredStepId === 0 && lastPreferredStepId > 0) {
			// Terminal status reached
			newCurrent = currentStep;
		}

		// Validation: don't allow going further than allowed
		if (newCurrent > preferredStepId && !allowAllSteps && preferredStepId > 0) {
			newCurrent = preferredStepId;
		}

		// Update state
		current = newCurrent;
		lastPreferredStepId = preferredStepId;
		prevStepsCount = stepsCount;
	});

	// Get current step state
	const currentStepState = $derived(OrderStatusMachine.getStepperState(order, current));
	const currentStepActionId = $derived(currentStepState.currentStepActionId);

	// Get transition for current step action
	const transitions = $derived(OrderStatusMachine.getAvailableTransitions(order));
	const currentTransition = $derived(transitions.find((t) => t.id === currentStepActionId));

	// For unavailable steps, get config from static config (not HATEOAS)
	const fallbackConfig = $derived(configService.getActionConfig(currentStepActionId!));

	const btnMinWidth = 'min-w-35';

	// Кнопка активна если:
	//   1. статус разрешает кнопку (isButtonEnabled — false для QUEUED/PROCESSING)
	//   2. пользователь находится на preferred-шаге или navigable-шаге
	const isActionEnabled = $derived(
		stepperState.isButtonEnabled &&
		(current === stepperState.preferredStepId || stepperState.navigableStepIds.includes(current))
	);
</script>

<!--
  OrderStepper

  ПРАВИЛА:
  ✅ Композитный компонент - объединяет DetailedStepper + Action компонент
  ✅ Использует OrderStatusMachine для получения stepper state
  ✅ Рендерит Action компонент для текущего шага с переданным renderer
  ✅ НЕ ПРОВЕРЯЕТ enabled (transition УЖЕ доступен из domain)
  ✅ Синхронизирует текущий шаг с preferredStepId при обновлении заказа
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
		<Card
			class="max-w-none py-1 pt-13 pb-5 focus-grid"
			style="--dot-color: {currentTransition?.color || fallbackConfig?.color || '#cfcfcf'}"
		>
			<div class="flex justify-center gap-2">
				{#if currentStepActionId === StepActionIdEnum.Calculate}
					<CalculateAction
						{order}
						transition={(currentTransition || fallbackConfig)!}
						{renderer}
						{onOpenCalculateModal}
						class={btnMinWidth}
						disabled={!isActionEnabled}
					/>
				{:else if currentStepActionId === StepActionIdEnum.Payment}
					<PaymentAction
						{order}
						transition={(currentTransition || fallbackConfig)!}
						{renderer}
						{onOpenPaymentModal}
						class={btnMinWidth}
						disabled={!isActionEnabled}
					/>
				{:else if currentStepActionId === StepActionIdEnum.Run}
					<RunAction
						{order}
						transition={(currentTransition || fallbackConfig)!}
						{renderer}
						class={btnMinWidth}
						disabled={!isActionEnabled}
					/>
				{:else if currentStepActionId === StepActionIdEnum.Download}
					<DownloadAction
						{order}
						transition={(currentTransition || fallbackConfig)!}
						{renderer}
						class={btnMinWidth}
						disabled={!isActionEnabled}
					/>
				{/if}
			</div>

			<div class="h-8">
				{#if !stepperState.navigableStepIds.includes(current) && stepperState.navigableStepIds.length > 0}
					{#if current > stepperState.preferredStepId}
						<P align="center" height="8" size="xs" space="normal" italic>Complete previous step first</P>
					{:else if current < stepperState.currentStep}
						<P align="center" height="8" size="xs" space="normal" italic>Cannot return to this step</P>
					{:else}
						<P align="center" height="8" size="xs" space="normal" italic>This step is not available</P>
					{/if}
				{:else if order.attributes.status === OrderStatus.FAILED}
					<P align="center" height="8" size="xs" space="normal" italic class="text-red-600 dark:text-red-400">
						Generation failed. Check errors for details.
					</P>
				{:else if order.attributes.status === OrderStatus.CANCELLED}
					<P align="center" height="8" size="xs" space="normal" italic class="text-gray-600 dark:text-gray-400">
						Order has been cancelled.
					</P>
				{:else if order.attributes.status === OrderStatus.REFUNDED}
					<P align="center" height="8" size="xs" space="normal" italic class="text-gray-600 dark:text-gray-400">
						Order failed and payment has been refunded.
					</P>
				{/if}
			</div>
		</Card>
	{/if}
</div>

<style>
	@reference "tailwindcss";
	/* Focus Grid Background Effect */
	.order-action-stepper :global(.focus-grid) {
		position: relative;
		overflow: hidden;
	}

	.order-action-stepper :global(.focus-grid::before) {
		content: '';
		position: absolute;
		inset: 0;
		opacity: 0.3;
		background-image: radial-gradient(var(--dot-color, #cfcfcf) 1px, transparent 1px);
		background-size: 19px 20px;
		mask-image: radial-gradient(circle at center, black 0%, black 50%, transparent 100%);
	}

	/* Dark mode - invert dot color */
	:global(.dark) .order-action-stepper :global(.focus-grid::before) {
		filter: invert(1) hue-rotate(180deg);
	}

	/* DetailedStepper - override primary colors to purple */
	.order-action-stepper :global(span.border-primary-600.bg-primary-600) {
		@apply border-slate-800 bg-slate-800;
	}

	:global(.dark) .order-action-stepper :global(span.dark\:border-primary-500.dark\:bg-primary-500) {
		@apply border-sky-700 bg-sky-700;
	}
</style>
