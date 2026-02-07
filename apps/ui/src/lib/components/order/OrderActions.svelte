<script lang="ts">
	import { ordersService } from '$lib/services/orders.service';
	import { HateoasAction, type OrderResponseDto } from '@api/shared';
	import CalculateAction from './actions/CalculateAction.svelte';
	import PaymentAction from './actions/PaymentAction.svelte';
	import RunAction from './actions/RunAction.svelte';
	import DownloadAction from './actions/DownloadAction.svelte';

	interface Props {
		order: OrderResponseDto;
		onUpdate?: () => void;
	}

	let { order, onUpdate }: Props = $props();

	const hasAction = (action: HateoasAction) => ordersService.hasAction(order, action);
</script>

<div class="space-y-4">
	<!-- Calculate Price Action -->
	{#if hasAction(HateoasAction.CALCULATE)}
		<CalculateAction {order} {onUpdate} />
	{/if}

	<!-- Payment Action -->
	{#if hasAction(HateoasAction.CHECKOUT) || hasAction(HateoasAction.PAYMENT_INTENT)}
		<PaymentAction {order} {onUpdate} />
	{/if}

	<!-- Run Processing Action -->
	{#if hasAction(HateoasAction.RUN)}
		<RunAction {order} {onUpdate} />
	{/if}

	<!-- Download Action -->
	{#if hasAction(HateoasAction.DOWNLOAD)}
		<DownloadAction {order} {onUpdate} />
	{/if}

	<!-- No Actions Available -->
	{#if !hasAction(HateoasAction.CALCULATE) && !hasAction(HateoasAction.CHECKOUT) && !hasAction(HateoasAction.PAYMENT_INTENT) && !hasAction(HateoasAction.RUN) && !hasAction(HateoasAction.DOWNLOAD)}
		<p class="text-gray-500 dark:text-gray-400 text-center py-4">No actions available for this order at the moment.</p>
	{/if}
</div>
