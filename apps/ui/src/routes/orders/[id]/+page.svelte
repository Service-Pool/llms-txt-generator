<script lang="ts">
	import { page } from '$app/state';
	import { onMount, onDestroy } from 'svelte';
	import { ordersStore } from '$lib/stores/orders.store.svelte';
	import { socketStore } from '$lib/stores/socket.store.svelte';
	import { Alert, Spinner, Heading, Hr } from 'flowbite-svelte';
	import ErrorList from '$lib/components/general/ErrorList.svelte';
	import DelayedRender from '$lib/components/general/DelayedRender.svelte';
	import OrderListItem from '../../../lib/components/order/OrderListItem.svelte';

	const orderId = $derived(Number(page.params.id));

	// Get order from store reactively - automatically updates when store changes
	const order = $derived(ordersStore.getById(orderId));

	let initialLoading = $state(true);
	let error = $state<string | null>(null);

	const loadOrderIfNeeded = async () => {
		try {
			initialLoading = true;
			error = null;

			// If order not in store, load it
			if (!ordersStore.getById(orderId)) {
				await ordersStore.refreshOrder(orderId);
			}

			// Subscribe to WebSocket updates for this specific order
			const currentOrder = ordersStore.getById(orderId);
			if (currentOrder && ['pending', 'processing'].includes(currentOrder.attributes.status)) {
				socketStore.subscribeToOrder(orderId);
			}
		} catch (exception) {
			error = exception instanceof Error ? exception.message : 'Failed to load order';
		} finally {
			initialLoading = false;
		}
	};

	onMount(() => {
		socketStore.init(); // Initialize WebSocket connection
		void loadOrderIfNeeded();
	});

	onDestroy(() => {
		// Clean up WebSocket subscription for this order when leaving the page
		socketStore.unsubscribeFromOrder(orderId);
	});
</script>

<svelte:head>
	<title>Order #{orderId} - LLMs.txt Generator</title>
</svelte:head>

{#if initialLoading}
	<div class="flex justify-center items-center py-20">
		<DelayedRender>
			<Spinner size="12" />
		</DelayedRender>
	</div>
{:else if error}
	<Alert color="red" class="flex justify-center py-10">
		<ErrorList {error} />
	</Alert>
{:else if order}
	<Heading tag="h2">Order #{order.attributes.id}</Heading>
	<Hr class="my-8" />
	<OrderListItem {order} isOpen={true} anyOrderOpen={true} />
{/if}
