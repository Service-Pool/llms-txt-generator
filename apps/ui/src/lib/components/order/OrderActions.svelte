<script lang="ts">
	import { ordersService } from '$lib/services/orders.service';
	import { HateoasAction, type OrderResponseDto } from '@api/shared';
	import CalculateAction from './actions/CalculateAction.svelte';
	import PaymentAction from './actions/PaymentAction.svelte';
	import RunAction from './actions/RunAction.svelte';
	import DownloadAction from './actions/DownloadAction.svelte';

	interface Props {
		order: OrderResponseDto;
		class?: string;
		mode?: 'card' | 'button';
		disabled?: boolean;
		loadingAction?: string | null;
		calculateModalOpen?: boolean;
	}

	let {
		order,
		class: className = '',
		mode = 'card',
		disabled = false,
		loadingAction = null,
		calculateModalOpen = $bindable(false)
	}: Props = $props();

	const hasAction = (action: HateoasAction) => ordersService.hasAction(order, action);
</script>

<div class="{mode === 'button' ? 'flex flex-col gap-2' : 'space-y-4'} {className}">
	<!-- Calculate Price Action -->
	{#if hasAction(HateoasAction.CALCULATE)}
		<CalculateAction {order} {mode} {disabled} bind:open={calculateModalOpen} />
	{/if}

	<!-- Payment Action -->
	{#if hasAction(HateoasAction.CHECKOUT) || hasAction(HateoasAction.PAYMENT_INTENT)}
		<PaymentAction {order} {mode} {disabled} loading={loadingAction === 'payment'} />
	{/if}

	<!-- Run Processing Action -->
	{#if hasAction(HateoasAction.RUN)}
		<RunAction {order} {mode} {disabled} loading={loadingAction === 'run'} />
	{/if}

	<!-- Download Action -->
	{#if hasAction(HateoasAction.DOWNLOAD)}
		<DownloadAction {order} {mode} {disabled} loading={loadingAction === 'download'} />
	{/if}

	<!-- No Actions Available -->
	{#if mode === 'card' && !hasAction(HateoasAction.CALCULATE) && !hasAction(HateoasAction.CHECKOUT) && !hasAction(HateoasAction.PAYMENT_INTENT) && !hasAction(HateoasAction.RUN) && !hasAction(HateoasAction.DOWNLOAD)}
		<p class="text-gray-500 dark:text-gray-400 text-center py-4">No actions available for this order at the moment.</p>
	{/if}
</div>
