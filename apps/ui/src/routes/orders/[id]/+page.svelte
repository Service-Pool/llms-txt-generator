<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { ordersStore } from '$lib/stores/orders.store.svelte';
	import { socketStore } from '$lib/stores/socket.store.svelte';
	import { configService } from '$lib/services/config.service';
	import { Alert, Spinner, Heading, Button } from 'flowbite-svelte';
	import { ArrowLeftOutline } from 'flowbite-svelte-icons';
	import ErrorList from '$lib/components/ui/error-list.svelte';
	import DelayedRender from '$lib/components/ui/delayed-render.svelte';
	import { OrderDetails } from '$lib/components/order';

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

			// Subscribe to WebSocket updates for this order (regardless of status)
			socketStore.subscribeToOrder(orderId);
		} catch (exception) {
			error = exception instanceof Error ? exception.message : 'Failed to load order';
		} finally {
			initialLoading = false;
		}
	};

	$effect(() => {
		// This means that order is deleted
		if (!initialLoading && !error && !order) {
			goto(configService.routes.orders);
		}
	});

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
	<div class="flex justify-between items-center mb-8">
		<Heading tag="h2" class="mb-0 whitespace-nowrap">Order #{order.attributes.id}</Heading>
		<Button href={configService.routes.orders} color="light" size="sm" class="whitespace-nowrap">
			<ArrowLeftOutline size="sm" class="me-2" />
			Order List
		</Button>
	</div>
	<OrderDetails {order} />
{/if}
