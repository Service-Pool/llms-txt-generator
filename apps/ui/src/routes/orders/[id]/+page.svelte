<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { ordersStore } from '$lib/stores/orders.store.svelte';
	import { orderWebSocketStore } from '$lib/stores/orderWebSocket.store.svelte';
	import { configService } from '$lib/services/config.service';
	import { Alert, Heading, Button, Card, Spinner } from 'flowbite-svelte';
	import { ArrowLeftOutline } from 'flowbite-svelte-icons';
	import ErrorList from '$lib/components/general/ErrorList.svelte';
	import DelayedRender from '$lib/components/general/DelayedRender.svelte';
	import OrderStatusBadge from '$lib/components/order/OrderStatusBadge.svelte';
	import OrderActions from '$lib/components/order/OrderActions.svelte';

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
				orderWebSocketStore.subscribeToOrder(orderId);
			}
		} catch (exception) {
			error = exception instanceof Error ? exception.message : 'Failed to load order';
		} finally {
			initialLoading = false;
		}
	};

	onMount(() => {
		orderWebSocketStore.init(); // Initialize WebSocket connection
		void loadOrderIfNeeded();
	});

	onDestroy(() => {
		// Clean up WebSocket subscription for this order when leaving the page
		orderWebSocketStore.unsubscribeFromOrder(orderId);
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
	<!-- Header -->
	<div class="mb-8">
		<!-- Header with Back Button -->
		<div class="flex items-center justify-between mb-4">
			<Heading tag="h1" class="text-3xl font-bold">Order details</Heading>
			<Button size="sm" color="light" onclick={() => goto(configService.routes.orders)}>
				<ArrowLeftOutline class="w-4 h-4 me-2" />
				Back to Orders
			</Button>
		</div>
	</div>

	<!-- Actions Section -->
	<OrderActions {order} class="mb-8" />

	<!-- Order Statistics - Single Card Layout -->
	<Card class="max-w-none p-6 mb-8">
		<div class="grid grid-cols-1 md:grid-cols-[120px_140px_120px_1fr_1fr] gap-6 mb-6">
			<!-- Order Number -->
			<div class="space-y-2">
				<div class="text-sm font-medium text-gray-500 dark:text-gray-400">Order</div>
				<div class="text-xl font-bold text-gray-900 dark:text-white">#{orderId}</div>
			</div>

			<!-- Status -->
			<div class="space-y-2">
				<div class="text-sm font-medium text-gray-500 dark:text-gray-400">Status</div>
				<OrderStatusBadge status={order.attributes.status} class="text-xs px-2 py-1" />
			</div>

			<!-- Price -->
			<div class="space-y-2">
				<div class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Price</div>
				<div class="text-lg font-bold text-gray-900 dark:text-white">
					{#if order.attributes.priceTotal !== null}
						{order.attributes.currencySymbol}{order.attributes.priceTotal.toFixed(2)}
					{:else}
						—
					{/if}
				</div>
			</div>

			<!-- Domain -->
			<div class="space-y-2">
				<div class="text-sm font-medium text-gray-500 dark:text-gray-400">Domain</div>
				<div class="text-lg font-semibold text-gray-900 dark:text-white wrap-break-words">
					{order.attributes.hostname}
				</div>
			</div>

			<!-- URLs Progress -->
			<div class="space-y-2">
				<div class="text-sm font-medium text-gray-500 dark:text-gray-400">URLs</div>
				<div class="text-xl font-bold text-gray-900 dark:text-white">
					{order.attributes.processedUrls} / {order.attributes.totalUrls || 0}
				</div>
				{#if order.attributes.totalUrls && order.attributes.totalUrls > 0}
					<div class="space-y-1">
						<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
							<div
								class="bg-blue-600 h-2 rounded-full transition-all"
								style="width: {(order.attributes.processedUrls / order.attributes.totalUrls) * 100}%"
							></div>
						</div>
						<div class="text-xs text-gray-500 dark:text-gray-400">
							{Math.round((order.attributes.processedUrls / order.attributes.totalUrls) * 100)}% completed
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Timeline Section -->
		<div class="border-t border-gray-200 dark:border-gray-700 pt-6">
			<div class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Timeline</div>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
				<div class="flex justify-between md:flex-col md:justify-start">
					<span class="text-gray-500 dark:text-gray-400">Created</span>
					<span class="font-medium text-gray-900 dark:text-white">
						{order.attributes.createdAt ? new Date(order.attributes.createdAt).toLocaleString() : '—'}
					</span>
				</div>
				<div class="flex justify-between md:flex-col md:justify-start">
					<span class="text-gray-500 dark:text-gray-400">Updated</span>
					<span class="font-medium text-gray-900 dark:text-white">
						{order.attributes.updatedAt ? new Date(order.attributes.updatedAt).toLocaleString() : '—'}
					</span>
				</div>
				<div class="flex justify-between md:flex-col md:justify-start">
					<span class="text-gray-500 dark:text-gray-400">Started</span>
					<span class="font-medium text-gray-900 dark:text-white">
						{order.attributes.startedAt ? new Date(order.attributes.startedAt).toLocaleString() : '—'}
					</span>
				</div>
				<div class="flex justify-between md:flex-col md:justify-start">
					<span class="text-gray-500 dark:text-gray-400">Completed</span>
					<span class="font-medium text-gray-900 dark:text-white">
						{order.attributes.completedAt ? new Date(order.attributes.completedAt).toLocaleString() : '—'}
					</span>
				</div>
			</div>
		</div>
	</Card>

	<!-- AI Model Information -->
	{#if order.attributes.currentAiModel}
		<Card class="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
			<Heading tag="h3" class="text-lg font-semibold mb-3">AI Model</Heading>
			<div class="space-y-2">
				<div class="text-base font-semibold text-gray-900 dark:text-white">
					{order.attributes.currentAiModel.displayName}
				</div>
				<div class="text-sm text-gray-600 dark:text-gray-400">
					{order.attributes.currentAiModel.description}
				</div>
				{#if order.attributes.currentAiModel.totalPrice}
					<div class="text-sm text-gray-500 dark:text-gray-400 mt-2">
						Price per URL: <span class="font-medium text-gray-900 dark:text-white">
							{order.attributes.currentAiModel.currencySymbol}{order.attributes.currentAiModel.totalPrice.toFixed(2)}
						</span>
					</div>
				{/if}
			</div>
		</Card>
	{/if}
{/if}
