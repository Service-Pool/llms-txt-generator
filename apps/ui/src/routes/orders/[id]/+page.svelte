<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { ordersService } from '$lib/services/orders.service';
	import { configService } from '$lib/services/config.service';
	import { Alert, Heading, Button, Card } from 'flowbite-svelte';
	import { ArrowLeftOutline } from 'flowbite-svelte-icons';
	import { UIError } from '$lib/errors/ui-error';
	import ErrorList from '$lib/components/general/ErrorList.svelte';
	import Spinner from '$lib/components/general/Spinner.svelte';
	import OrderStatusBadge from '$lib/components/order/OrderStatusBadge.svelte';
	import OrderActions from '$lib/components/order/OrderActions.svelte';
	import type { OrderResponseDto } from '@api/shared';

	const orderId = $derived(Number(page.params.id));

	let order = $state<OrderResponseDto | null>(null);
	let loading = $state(true);
	let error = $state<string[] | string | null>(null);

	const loadOrder = async () => {
		try {
			loading = true;
			error = null;
			const response = await ordersService.getById(orderId);
			order = response.getData();
		} catch (exception) {
			if (exception instanceof UIError) {
				error = exception.context;
			} else if (exception instanceof Error) {
				error = exception.message;
			}
			throw exception;
		} finally {
			loading = false;
		}
	};

	onMount(() => {
		loadOrder();
	});
</script>

<svelte:head>
	<title>Order #{orderId} - LLMs.txt Generator</title>
</svelte:head>

{#if loading}
	<div class="flex justify-center items-center py-20">
		<Spinner size="12" delay={500} />
	</div>
{:else if error}
	<Alert color="red">
		<ErrorList {error} />
	</Alert>
{:else if order}
	<!-- Header -->
	<div class="mb-8">
		<!-- Back Button -->
		<div class="mb-4">
			<Button size="sm" color="light" onclick={() => goto(configService.routes.orders)}>
				<ArrowLeftOutline class="w-4 h-4 me-2" />
				Back to Orders
			</Button>
		</div>

		<div class="flex items-center justify-between mb-4">
			<Heading tag="h1" class="text-3xl font-bold">
				Order #{orderId}
			</Heading>
			<OrderStatusBadge status={order.status} class="text-base px-4 py-2 font-semibold" />
		</div>
		<p class="text-gray-500 dark:text-gray-400 text-lg">{order.hostname}</p>
	</div>

	<!-- Order Information Grid -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
		<!-- Total URLs -->
		<Card class="p-6 max-w-none">
			<div class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Total URLs</div>
			<div class="text-2xl font-bold text-gray-900 dark:text-white">
				{order.totalUrls || '—'}
			</div>
		</Card>

		<!-- Processed URLs -->
		<Card class="p-6 max-w-none">
			<div class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Processed URLs</div>
			<div class="text-2xl font-bold text-gray-900 dark:text-white">
				{order.processedUrls}
			</div>
			{#if order.totalUrls && order.totalUrls > 0}
				<div class="mt-2">
					<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
						<div
							class="bg-blue-600 h-2 rounded-full transition-all"
							style="width: {(order.processedUrls / order.totalUrls) * 100}%"
						></div>
					</div>
				</div>
			{/if}
		</Card>

		<!-- Price -->
		<Card class="p-6 max-w-none">
			<div class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Total Price</div>
			<div class="text-2xl font-bold text-gray-900 dark:text-white">
				{#if order.priceTotal !== null}
					{order.currencySymbol}{order.priceTotal.toFixed(2)}
				{:else}
					—
				{/if}
			</div>
		</Card>
	</div>

	<!-- AI Model Section -->
	{#if order.currentAiModel}
		<div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800 mb-8">
			<div class="flex items-center gap-3">
				<div class="flex-1">
					<div class="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Selected AI Model</div>
					<div class="text-lg font-semibold text-gray-900 dark:text-white">
						{order.currentAiModel.displayName}
					</div>
					<div class="text-sm text-gray-600 dark:text-gray-400 mt-1">
						{order.currentAiModel.description}
					</div>
				</div>
				{#if order.currentAiModel.totalPrice}
					<div class="text-right">
						<div class="text-sm text-gray-500 dark:text-gray-400">Price per URL</div>
						<div class="text-lg font-semibold text-gray-900 dark:text-white">
							{order.currentAiModel.currencySymbol}{order.currentAiModel.totalPrice.toFixed(2)}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Actions Section -->
	<div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
		<Heading tag="h2" class="text-xl font-semibold mb-4">Available Actions</Heading>
		<OrderActions {order} onUpdate={loadOrder} />
	</div>

	<!-- Timeline / Metadata -->
	<div class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
		<Heading tag="h2" class="text-xl font-semibold mb-4">Order Timeline</Heading>
		<div class="space-y-3 text-sm">
			<div class="flex justify-between">
				<span class="text-gray-500 dark:text-gray-400">Created</span>
				<span class="font-medium text-gray-900 dark:text-white">
					{new Date(order.createdAt).toLocaleString()}
				</span>
			</div>
			{#if order.startedAt}
				<div class="flex justify-between">
					<span class="text-gray-500 dark:text-gray-400">Started</span>
					<span class="font-medium text-gray-900 dark:text-white">
						{new Date(order.startedAt).toLocaleString()}
					</span>
				</div>
			{/if}
			{#if order.completedAt}
				<div class="flex justify-between">
					<span class="text-gray-500 dark:text-gray-400">Completed</span>
					<span class="font-medium text-gray-900 dark:text-white">
						{new Date(order.completedAt).toLocaleString()}
					</span>
				</div>
			{/if}
		</div>
	</div>
{/if}
