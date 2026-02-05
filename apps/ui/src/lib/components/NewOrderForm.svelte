<script lang="ts">
	import { ordersService } from "$lib/services/orders.service";
	import { Card, Input, Label, Button, Helper, Alert } from "flowbite-svelte";
	import type { CreateOrderResponseDto } from "@api/shared";

	interface Props {
		onCreate: (order: CreateOrderResponseDto) => void;
	}

	let { onCreate }: Props = $props();

	let hostname = $state("");
	let submitting = $state(false);
	let error = $state<string | null>(null);

	const isUrlValid = $derived(/^https?:\/\/.+/.test(hostname));
	const canCreate = $derived(isUrlValid && !submitting);

	const handleSubmit = async (e: Event) => {
		e.preventDefault();

		if (!canCreate) return;

		try {
			submitting = true;
			error = null;

			const response = await ordersService.create({ hostname });
			const order = response.getData();

			onCreate(order);

			// Reset form
			hostname = "";
		} catch (err) {
			error =
				err instanceof Error ? err.message : "Failed to create order";
		} finally {
			submitting = false;
		}
	};
</script>

<Card size="xl" class="p-4 sm:p-6 md:p-8">
	<h2 class="text-2xl font-bold mb-4">Create New Order</h2>

	<form onsubmit={handleSubmit} class="space-y-4">
		<div>
			<Label for="hostname" class="mb-2">Website URL</Label>
			<Input
				id="hostname"
				type="text"
				bind:value={hostname}
				disabled={submitting}
				placeholder="https://example.com"
				color={!isUrlValid && hostname ? "red" : undefined} />
			{#if !isUrlValid && hostname}
				<Helper color="red">
					Please enter a valid URL (must start with http:// or
					https://)
				</Helper>
			{/if}
		</div>

		{#if error}
			<Alert color="red">{error}</Alert>
		{/if}

		<Button type="submit" disabled={!canCreate} class="w-full">
			{submitting ? "Creating..." : "Create Order"}
		</Button>
	</form>
</Card>
