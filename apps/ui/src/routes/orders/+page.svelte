<script lang="ts">
	import { onMount } from 'svelte';
	import { Alert, Button, Hr, Skeleton, Card } from 'flowbite-svelte';
	import { statsStore } from '$lib/stores/stats.store.svelte';
	import { ordersStore } from '$lib/stores/orders.store.svelte';
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
		} catch (exception) {
			if (exception instanceof UIError) {
				error = exception.context;
			} else if (exception instanceof Error) {
				error = exception.message;
			}
		}
	};

	const handlePageChange = (newPage: number) => {
		ordersStore.setPage(newPage);
	};

	const handleLimitChange = (newLimit: number) => {
		ordersStore.setLimit(newLimit);
	};

	const handleOrderCreated = (order: OrderResponseDto) => {
		ordersStore.addOrder(order);
	};

	onMount(async () => {
		await statsStore.init();
		await loadOrders();
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
		{/if}
		<Hr class="my-8" />
		<OrdersList items={ordersStore.items ?? []} />
		<Hr class="my-8" />
		{#if ordersStore.total > ordersStore.limit}
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
