<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Alert, Button, Hr, Skeleton, Card } from 'flowbite-svelte';
	import { statsStore } from '$lib/stores/stats.store.svelte';
	import { ordersStore } from '$lib/stores/orders.store.svelte';
	import { orderWebSocketStore } from '$lib/stores/orderWebSocket.store.svelte';
	import { UIError } from '$lib/errors/ui-error';
	import DelayedRender from '$lib/components/general/DelayedRender.svelte';
	import ErrorList from '$lib/components/general/ErrorList.svelte';
	import Hero from '$lib/components/general/Hero.svelte';
	import NewOrderForm from '$lib/components/order/NewOrderForm.svelte';
	import OrdersList from '$lib/components/order/OrdersList.svelte';
	import Pagination from '$lib/components/general/Pagination.svelte';
	import type { OrderResponseDto } from '@api/shared';

	let error = $state<string[] | string | null>(null);

	const loadOrders = async () => {
		try {
			error = null;
			await ordersStore.loadOrders();

			// Subscribe to WebSocket updates for all loaded orders
			subscribeToLoadedOrders();
		} catch (exception) {
			if (exception instanceof UIError) {
				error = exception.context;
			} else if (exception instanceof Error) {
				error = exception.message;
			}
		}
	};

	const subscribeToLoadedOrders = () => {
		if (ordersStore.items) {
			// Subscribe to ALL orders on the page - we can't predict which ones will be updated
			const allOrderIds = ordersStore.items.map((order) => order.attributes.id);

			if (allOrderIds.length > 0) {
				orderWebSocketStore.subscribeToOrders(allOrderIds);
			}
		}
	};

	const handlePageChange = (newPage: number) => {
		ordersStore.setPage(newPage);
		// Orders will be loaded in ordersStore.setPage, so subscribeToLoadedOrders will be called from loadOrders
	};

	const handleLimitChange = (newLimit: number) => {
		ordersStore.setLimit(newLimit);
		// Orders will be loaded in ordersStore.setLimit, so subscribeToLoadedOrders will be called from loadOrders
	};

	const handleOrderCreated = (order: OrderResponseDto) => {
		ordersStore.addOrder(order);

		// Subscribe to the new order for real-time updates
		orderWebSocketStore.subscribeToOrder(order.attributes.id);
	};

	onMount(async () => {
		await statsStore.init();
		orderWebSocketStore.init(); // Initialize WebSocket for order updates
		await loadOrders();
	});

	onDestroy(() => {
		// Clean up WebSocket subscriptions when leaving the page
		orderWebSocketStore.unsubscribeFromAllOrders();
	});
</script>

<svelte:head>
	<title>Orders - LLMs.txt Generator</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-6">
	<Hero />
	<NewOrderForm onCreate={handleOrderCreated} />

	{#if ordersStore.items === null || ordersStore.loading}
		<div class="space-y-3">
			{#each Array(3) as _, i (i)}
				<DelayedRender>
					<Card class="max-w-none p-4">
						<Skeleton size="xl" class="my-8" />
					</Card>
				</DelayedRender>
			{/each}
		</div>
	{:else if error}
		<Alert color="red">
			<ErrorList class="text-xs dark:text-black" {error} />
			<Button onclick={() => loadOrders()} size="xs" color="red" class="mt-2">Try again</Button>
		</Alert>
	{:else}
		{#if ordersStore.total > ordersStore.limit}
			<Pagination
				page={ordersStore.page}
				limit={ordersStore.limit}
				total={ordersStore.total}
				onPageChange={handlePageChange}
				onLimitChange={handleLimitChange}
			/>
			<Hr class="my-8" />
		{/if}

		<OrdersList items={ordersStore.items ?? []} />

		{#if ordersStore.total > ordersStore.limit}
			<Hr class="my-8" />
			<Pagination
				page={ordersStore.page}
				limit={ordersStore.limit}
				total={ordersStore.total}
				onPageChange={handlePageChange}
				onLimitChange={handleLimitChange}
			/>
		{/if}
	{/if}
</div>
