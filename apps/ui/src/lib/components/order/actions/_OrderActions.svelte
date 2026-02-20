<script lang="ts">
	import { ordersService } from '$lib/services/orders.service';
	import { OrderStatus, type OrderResponseDto } from '@api/shared';
	import { DetailedStepper, Button, Card, P } from 'flowbite-svelte';
	import { ChevronLeftOutline, ChevronRightOutline } from 'flowbite-svelte-icons';
	import CalculateAction from './CalculateAction.svelte';
	import PaymentAction from './PaymentAction.svelte';
	import RunAction from './RunAction.svelte';
	import DownloadAction from './DownloadAction.svelte';
	import DeleteAction from './DeleteAction.svelte';

	interface Props {
		order: OrderResponseDto;
		class?: string;
		mode?: 'spd-button' | 'stepper';
		loadingAction?: string | null;
		calculateModalOpen?: boolean;
		paymentModalOpen?: boolean;
		paymentClientSecret?: string | null;
		paymentPublishableKey?: string | null;
	}

	let {
		order,
		class: className = '',
		mode = 'stepper',
		loadingAction = null,
		calculateModalOpen = $bindable(false),
		paymentModalOpen = $bindable(false),
		paymentClientSecret = $bindable(null),
		paymentPublishableKey = $bindable(null)
	}: Props = $props();

	const enabledActions = $derived(ordersService.getEnabledActions(order));
	const allowAllSteps = true;
	const btnMinWidth = 'min-w-50';

	// Динамические шаги степпера - исключаем Payment если цена 0
	const steps = $derived.by(() => {
		const allSteps = [
			{ label: 'Configure', description: 'Select AI model', actionId: 'calculate' },
			{ label: 'Payment', description: 'Process payment', actionId: 'payment' },
			{ label: 'Generate', description: 'Run generation', actionId: 'run' },
			{ label: 'Complete', description: 'Download results', actionId: 'download' }
		];

		// Исключаем Payment если цена 0 и перенумеруем
		return allSteps
			.filter((step) => !(step.actionId === 'payment' && order.attributes.priceTotal === 0))
			.map((step, index) => ({ ...step, id: index + 1 }));
	});

	// Маппинг номера шага к действию
	const stepActions = $derived(Object.fromEntries(steps.map((s) => [s.id, s.actionId])));

	// Вычисление максимально допустимого шага на основе статуса заказа
	const maxAllowedStep = $derived.by(() => {
		const status = order.attributes.status;
		const hasModel = !!order.attributes.currentAiModel;

		// Определяем целевое действие на основе статуса
		let targetActionId: string;

		if (status === OrderStatus.CREATED && !hasModel) {
			targetActionId = 'calculate';
		} else if (status === OrderStatus.CREATED || status === OrderStatus.CALCULATED) {
			// После выбора модели: payment или run (если цена = 0)
			targetActionId = order.attributes.priceTotal === 0 ? 'run' : 'payment';
		} else if (status === OrderStatus.PAID || status === OrderStatus.QUEUED) {
			targetActionId = 'run';
		} else {
			// PROCESSING, COMPLETED, FAILED
			targetActionId = 'download';
		}

		// Находим номер шага по actionId
		const foundStep = steps.find((s) => s.actionId === targetActionId)?.id ?? 1;

		return foundStep;
	});

	// Текущий шаг
	let current = $state(1);
	let prevMaxAllowed = 0;
	let prevStepsCount = 0;

	// Синхронизация current с maxAllowedStep
	$effect(() => {
		const stepsCount = steps.length;

		// Если структура steps изменилась (Payment добавлен/удален)
		if (stepsCount !== prevStepsCount) {
			// При изменении структуры принудительно синхронизируем с maxAllowedStep
			current = maxAllowedStep;
			prevMaxAllowed = maxAllowedStep;
			prevStepsCount = stepsCount;
		}
		// Если maxAllowedStep увеличился (статус заказа обновился)
		else if (maxAllowedStep > prevMaxAllowed) {
			current = maxAllowedStep;
			prevMaxAllowed = maxAllowedStep;
		}
		// Обновляем prevMaxAllowed даже если не продвинулись
		else if (maxAllowedStep !== prevMaxAllowed) {
			prevMaxAllowed = maxAllowedStep;
		}
		// Валидация: не позволяем переходить дальше допустимого
		if (current > maxAllowedStep && !allowAllSteps) {
			current = maxAllowedStep;
		}
	});

	// Действие для текущего шага
	const currentStepActionId = $derived(stepActions[current]);

	// Проверка доступности действия
	const isActionEnabled = (actionId: string) => enabledActions.some((a) => a.id === actionId);
</script>

{#if mode === 'stepper'}
	<!-- Stepper Mode -->
	<div class="{className} order-action-stepper space-y-2">
		<!-- Stepper -->
		<Card class="px-4 py-3 max-w-none border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
			<DetailedStepper class="justify-between" {steps} showCheckmarkForCompleted={true} bind:current />
		</Card>

		<!-- Action Buttons - ОДНА кнопка для текущего шага -->
		{#if currentStepActionId}
			<Card
				class="max-w-none py-1 pt-13 pb-5 bg-[linear-gradient(rgba(255,255,255,0.9),rgba(255,255,255,0.9)),url('/pattern.svg')] dark:bg-[linear-gradient(rgba(16,24,40,0.6),rgba(16,24,40,0.6)),url('/pattern.svg')] bg-contain bg-repeat"
			>
				<div class="flex justify-center gap-2">
					{#if currentStepActionId === 'calculate'}
						<CalculateAction
							class={btnMinWidth}
							{order}
							{mode}
							bind:open={calculateModalOpen}
							disabled={!isActionEnabled('calculate')}
						/>
					{:else if currentStepActionId === 'payment'}
						<PaymentAction
							class={btnMinWidth}
							{order}
							{mode}
							bind:open={paymentModalOpen}
							bind:clientSecret={paymentClientSecret}
							bind:publishableKey={paymentPublishableKey}
							disabled={!isActionEnabled('payment')}
						/>
					{:else if currentStepActionId === 'run'}
						<RunAction class={btnMinWidth} {order} {mode} disabled={!isActionEnabled('run')} />
					{:else if currentStepActionId === 'download'}
						<DownloadAction class={btnMinWidth} {order} {mode} disabled={!isActionEnabled('download')} />
					{/if}
				</div>

				<div class="h-8">
					{#if current > maxAllowedStep}
						<P align="center" height="8" size="xs" space="normal" italic>Complete previous step to continue</P>
					{/if}
				</div>
			</Card>
		{/if}
	</div>
{/if}

{#if mode === 'spd-button'}
	{#each enabledActions as action}
		{#if action.id === 'calculate'}
			<CalculateAction
				{order}
				{mode}
				class="w-10 h-10 shadow-md rounded-full"
				loading={loadingAction === 'calculate'}
				bind:open={calculateModalOpen}
			/>
		{:else if action.id === 'payment'}
			<PaymentAction
				{order}
				{mode}
				class="w-10 h-10 shadow-md rounded-full"
				loading={loadingAction === 'payment'}
				bind:open={paymentModalOpen}
				bind:clientSecret={paymentClientSecret}
				bind:publishableKey={paymentPublishableKey}
			/>
		{:else if action.id === 'run'}
			<RunAction {order} {mode} class="w-10 h-10 shadow-md rounded-full" loading={loadingAction === 'run'} />
		{:else if action.id === 'download'}
			<DownloadAction {order} {mode} class="w-10 h-10 shadow-md rounded-full" loading={loadingAction === 'download'} />
		{:else if action.id === 'delete'}
			<DeleteAction {order} {mode} class="w-10 h-10 shadow-md rounded-full" loading={loadingAction === 'delete'} />
		{/if}
	{/each}
{/if}

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
