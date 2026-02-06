<script lang="ts">
	import { onMount } from "svelte";
	import { ordersService } from "$lib/services/orders.service";
	import { Spinner, Alert, Button, Hr } from "flowbite-svelte";
	import { statsStore } from "$lib/stores/stats.store.svelte";
	import { UIError } from "$lib/errors/ui-error";
	import ErrorList from "$lib/components/general/ErrorList.svelte";
	import NewOrderForm from "$lib/components/NewOrderForm.svelte";
	import OrdersList from "$lib/components/OrdersList.svelte";
	import Pagination from "$lib/components/general/Pagination.svelte";
	import type { CreateOrderResponseDto, OrderResponseDto } from "@api/shared";

	let orders = $state<OrderResponseDto[]>([]);
	let loading = $state(true);
	let error = $state<string[] | string | null>(null);
	let page = $state(1);
	let limit = $state(5);
	let total = $state(0);

	const loadOrders = async () => {
		try {
			loading = true;
			error = null;
			const response = await ordersService.getAll(page, limit);
			const data = response.getData();
			orders = data.items;
			total = data.total;
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

	const handleCreate = (newOrder: CreateOrderResponseDto) => {
		// Add new order to the top of the list
		orders = [newOrder as unknown as OrderResponseDto, ...orders];
		total = total + 1;
	};

	const handlePageChange = (newPage: number) => {
		page = newPage;
		loadOrders();
	};

	const handleLimitChange = (newLimit: number) => {
		limit = newLimit;
		page = 1; // Reset to first page when changing limit
		loadOrders();
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
	<NewOrderForm onCreate={handleCreate} />

	{#if loading}
		<div class="flex justify-center py-12">
			<Spinner size="12" />
		</div>
	{:else if error}
		<Alert color="red">
			<ErrorList class="text-xs dark:text-black" {error} />
			<Button
				onclick={() => loadOrders()}
				size="xs"
				color="red"
				class="mt-2">
				Try again
			</Button>
		</Alert>
	{:else}
		{#if total > limit}
			<Pagination
				{page}
				{limit}
				{total}
				onPageChange={handlePageChange}
				onLimitChange={handleLimitChange} />
		{/if}
		<Hr class="my-8" />
		<OrdersList items={orders} />
		<Hr class="my-8" />
		{#if total > limit}
			<Pagination
				{page}
				{limit}
				{total}
				onPageChange={handlePageChange}
				onLimitChange={handleLimitChange} />
		{/if}
	{/if}
</div>
