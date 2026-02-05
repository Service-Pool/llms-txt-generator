<script lang="ts">
	import { onMount } from "svelte";
	import { ordersService } from "$lib/services/orders.service";
	import { statsStore } from "$lib/stores/stats.store.svelte";
	import NewOrderForm from "$lib/components/NewOrderForm.svelte";
	import OrdersList from "$lib/components/OrdersList.svelte";
	import { Spinner, Alert, Button } from "flowbite-svelte";
	import type { CreateOrderResponseDto, OrderResponseDto } from "@api/shared";

	let orders = $state<OrderResponseDto[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	const loadOrders = async () => {
		try {
			loading = true;
			error = null;
			const response = await ordersService.getAll();
			orders = response.getData().items;
		} catch (err) {
			error =
				err instanceof Error ? err.message : "Failed to load orders";
		} finally {
			loading = false;
		}
	};

	const handleCreate = (newOrder: CreateOrderResponseDto) => {
		// Add new order to the top of the list
		orders = [newOrder as unknown as OrderResponseDto, ...orders];
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
			<p>{error}</p>
			<Button
				onclick={() => loadOrders()}
				size="xs"
				color="red"
				class="mt-2">
				Try again
			</Button>
		</Alert>
	{:else}
		<OrdersList items={orders} />
	{/if}
</div>
