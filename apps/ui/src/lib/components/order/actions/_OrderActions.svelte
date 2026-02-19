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

	// Шаги степпера для Flowbite
	const steps = [
		{ id: 1, label: 'Configure', description: 'Select AI model' },
		{ id: 2, label: 'Payment', description: 'Process payment' },
		{ id: 3, label: 'Generate', description: 'Run generation' },
		{ id: 4, label: 'Complete', description: 'Download results' }
	];

	// Функция для вычисления шага на основе статуса заказа
	const calculateStepFromStatus = () => {
		const status = order.attributes.status;
		const hasModel = !!order.attributes.currentAiModel;

		// Configure (1)
		if (status === OrderStatus.CREATED && !hasModel) return 1;

		// Payment (2)
		if (status === OrderStatus.CREATED && hasModel) return 2;
		if (status === OrderStatus.CALCULATED) return 2;

		// Generate (3)
		if (status === OrderStatus.PAID || status === OrderStatus.QUEUED) return 3;

		// Complete (4)
		if (status === OrderStatus.PROCESSING) return 4;
		if (status === OrderStatus.COMPLETED) return 4;
		if (status === OrderStatus.FAILED) return 4;

		return 1; // По умолчанию Configure
	};

	// Текущий шаг - управляемое состояние
	let current = $state(calculateStepFromStatus());

	// Обновляем current при изменении статуса заказа
	$effect(() => {
		current = calculateStepFromStatus();
	});

	// Маппинг номера шага к действию
	const stepActions: Record<number, string> = {
		1: 'calculate',
		2: 'payment',
		3: 'run',
		4: 'download'
	};

	// Действие для текущего шага
	const currentStepActionId = $derived(stepActions[current]);

	// Проверка доступности действия
	const isActionEnabled = (actionId: string) => enabledActions.some((a) => a.id === actionId);
</script>

{#if mode === 'stepper'}
	<!-- Stepper Mode -->
	<div class={className}>
		<!-- Stepper -->
		<Card class="px-4 py-3 max-w-none border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
			<DetailedStepper class="justify-between" {steps} bind:current />
		</Card>

		<!-- Action Buttons - ОДНА кнопка для текущего шага -->
		{#if currentStepActionId}
			<Card class="max-w-none mt-2 p-1">
				<div class="flex justify-center gap-2 mt-14">
					{#if currentStepActionId === 'calculate'}
						<CalculateAction
							class="min-w-40"
							{order}
							{mode}
							bind:open={calculateModalOpen}
							disabled={!isActionEnabled('calculate')}
						/>
					{:else if currentStepActionId === 'payment'}
						<PaymentAction
							class="min-w-40"
							{order}
							{mode}
							bind:open={paymentModalOpen}
							bind:clientSecret={paymentClientSecret}
							bind:publishableKey={paymentPublishableKey}
							disabled={!isActionEnabled('payment')}
						/>
					{:else if currentStepActionId === 'run'}
						<RunAction class="min-w-40" {order} {mode} disabled={!isActionEnabled('run')} />
					{:else if currentStepActionId === 'download'}
						<DownloadAction class="min-w-40" {order} {mode} disabled={!isActionEnabled('download')} />
					{/if}
				</div>

				<div class="h-8">
					{#if currentStepActionId === 'payment' && order.attributes.priceTotal === 0}
						<P align="center" height="8" size="xs" space="normal" italic>Disabled due to zero price</P>
					{/if}
				</div>

				<!-- Navigation Buttons -->
				<div class="flex justify-end gap-1 mt-1">
					<Button
						size="xs"
						color="light"
						onclick={() => (current = Math.max(1, current - 1))}
						disabled={current === 1}
						class="border-none p-1"
					>
						<ChevronLeftOutline size="sm" />
					</Button>
					<Button
						size="xs"
						color="light"
						onclick={() => (current = Math.min(steps.length, current + 1))}
						disabled={current === steps.length}
						class="border-none p-1"
					>
						<ChevronRightOutline size="sm" />
					</Button>
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
