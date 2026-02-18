<script lang="ts">
	import { ordersService } from '$lib/services/orders.service';
	import { OrderStatus, type OrderResponseDto } from '@api/shared';
	import { Stepper } from 'flowbite-svelte';
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
		{ id: 1, label: 'Configure' },
		{ id: 2, label: 'Payment' },
		{ id: 3, label: 'Generate' },
		{ id: 4, label: 'Complete' }
	];

	// Вычисляем номер текущего шага (1-4) на основе статуса заказа
	let current = $derived.by(() => {
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
	<div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg {className}">
		<div class="px-4 py-3">
			<!-- Stepper -->
			<Stepper {steps} bind:current />

			<!-- Action Buttons - ОДНА кнопка для текущего шага -->
			{#if currentStepActionId}
				<div class="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
					<span class="text-xs font-medium text-gray-600 dark:text-gray-400 mr-1">Actions:</span>

					{#if currentStepActionId === 'calculate'}
						<CalculateAction {order} {mode} bind:open={calculateModalOpen} disabled={!isActionEnabled('calculate')} />
					{:else if currentStepActionId === 'payment'}
						<PaymentAction
							{order}
							{mode}
							bind:open={paymentModalOpen}
							bind:clientSecret={paymentClientSecret}
							bind:publishableKey={paymentPublishableKey}
							disabled={!isActionEnabled('payment')}
						/>
					{:else if currentStepActionId === 'run'}
						<RunAction {order} {mode} disabled={!isActionEnabled('run')} />
					{:else if currentStepActionId === 'download'}
						<DownloadAction {order} {mode} disabled={!isActionEnabled('download')} />
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/if}

{#if mode === 'spd-button'}
	{#each enabledActions as action}
		{#if action.id === 'calculate'}
			<CalculateAction {order} {mode} loading={loadingAction === 'calculate'} bind:open={calculateModalOpen} />
		{:else if action.id === 'payment'}
			<PaymentAction
				{order}
				{mode}
				loading={loadingAction === 'payment'}
				bind:open={paymentModalOpen}
				bind:clientSecret={paymentClientSecret}
				bind:publishableKey={paymentPublishableKey}
			/>
		{:else if action.id === 'run'}
			<RunAction {order} {mode} loading={loadingAction === 'run'} />
		{:else if action.id === 'download'}
			<DownloadAction {order} {mode} loading={loadingAction === 'download'} />
		{:else if action.id === 'delete'}
			<DeleteAction {order} {mode} loading={loadingAction === 'delete'} />
		{/if}
	{/each}
{/if}
