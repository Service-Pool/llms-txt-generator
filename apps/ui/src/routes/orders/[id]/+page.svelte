<script lang="ts">
	import { page } from '$app/state';
	import { onMount, onDestroy } from 'svelte';
	import { ordersStore } from '$lib/stores/orders.store.svelte';
	import { socketStore } from '$lib/stores/socket.store.svelte';
	import { Alert, Spinner } from 'flowbite-svelte';
	import ErrorList from '$lib/components/general/ErrorList.svelte';
	import DelayedRender from '$lib/components/general/DelayedRender.svelte';
	import OrderItemPage from '$lib/components/order/OrderItemPage.svelte';

	const orderId = $derived(Number(page.params.id));
	const order = $derived(ordersStore.getById(orderId));

	let initialLoading = $state(true);
	let error = $state<string | null>(null);

	const loadOrderIfNeeded = async () => {
		try {
			initialLoading = true;
			error = null;

			if (!ordersStore.getById(orderId)) {
				await ordersStore.refreshOrder(orderId);
			}

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
		socketStore.init();
		void loadOrderIfNeeded();
	});

	onDestroy(() => {
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
	<OrderItemPage {order} />
{/if}
