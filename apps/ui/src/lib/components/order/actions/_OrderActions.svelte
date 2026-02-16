<script lang="ts">
	import { ordersService } from '$lib/services/orders.service';
	import type { OrderResponseDto } from '@api/shared';
	import CalculateAction from './CalculateAction.svelte';
	import PaymentAction from './PaymentAction.svelte';
	import RunAction from './RunAction.svelte';
	import DownloadAction from './DownloadAction.svelte';

	interface Props {
		order: OrderResponseDto;
		class?: string;
		mode?: 'card' | 'button';
		loadingAction?: string | null;
		calculateModalOpen?: boolean;
		paymentModalOpen?: boolean;
		paymentClientSecret?: string | null;
		paymentPublishableKey?: string | null;
	}

	let {
		order,
		class: className = '',
		mode = 'card',
		loadingAction = null,
		calculateModalOpen = $bindable(false),
		paymentModalOpen = $bindable(false),
		paymentClientSecret = $bindable(null),
		paymentPublishableKey = $bindable(null)
	}: Props = $props();

	const enabledActions = $derived(ordersService.getEnabledActions(order));
	const hasAnyAction = $derived(enabledActions.length > 0);
</script>

<div class="{mode === 'button' ? 'flex flex-col gap-2' : 'space-y-4'} {className}">
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
		{/if}
	{/each}

	<!-- No Actions Available -->
	{#if mode === 'card' && !hasAnyAction}
		<p class="text-gray-500 dark:text-gray-400 text-center py-4">No actions available for this order at the moment.</p>
	{/if}
</div>
