<script lang="ts">
	import { Card, Input, Label, Button, Helper, Alert, Badge } from 'flowbite-svelte';
	import { ordersService } from '$lib/services/orders.service';
	import { UIError } from '$lib/errors/ui-error';
	import ErrorList from '$lib/components/general/ErrorList.svelte';
	import CalculateModal from './modals/CalculateModal.svelte';
	import { statsStore } from '$lib/stores/stats.store.svelte';
	import type { CreateOrderResponseDto, OrderResponseDto } from '@api/shared';

	interface Props {
		onCreate?: (order: OrderResponseDto) => void;
	}

	let { onCreate }: Props = $props();

	let hostname = $state('');
	let submitting = $state(false);
	let error = $state<string[] | string | null>(null);
	let createdOrder = $state<CreateOrderResponseDto | null>(null);
	let showModelSelection = $state(false);
	let completed = $state<number | null>();

	// Subscribe to completedCount store
	$effect(() => {
		const unsubscribe = statsStore.completedCount.subscribe((value) => {
			completed = value;
		});

		return () => unsubscribe();
	});

	const isUrlValid = $derived(/^https?:\/\/.+/.test(hostname));
	const canCreate = $derived(isUrlValid && !submitting);

	const handleSubmit = async (e: Event) => {
		e.preventDefault();

		if (!canCreate) return;

		try {
			submitting = true;
			error = null;

			const response = await ordersService.create({ hostname });
			createdOrder = response.getData();

			// Load full order data and notify parent
			const fullOrderResponse = await ordersService.getById(createdOrder.attributes.id);
			const fullOrder = fullOrderResponse.getData();
			onCreate?.(fullOrder);

			// Reset form
			resetForm();

			showModelSelection = true;
		} catch (exception) {
			if (exception instanceof UIError) {
				error = exception.context;
			} else if (exception instanceof Error) {
				error = exception.message;
			}
			throw exception;
		} finally {
			submitting = false;
		}
	};

	const resetForm = () => {
		hostname = '';
		error = null;
	};
</script>

<Card size="xl" class="p-4 sm:p-6 md:p-8">
	<div class="flex flex-wrap gap-2 items-center justify-between mb-4">
		<h2 class="text-2xl font-bold whitespace-nowrap">Create New Order</h2>
		<span class="text-sm whitespace-nowrap text-gray-600 dark:text-gray-400">
			ATM generated <Badge color="indigo">{completed?.toLocaleString() ?? '—'} llms.txt</Badge> files
		</span>
	</div>
	<form onsubmit={handleSubmit} class="space-y-4">
		<div>
			<Label for="hostname" class="mb-2">Website URL</Label>
			<Input
				id="hostname"
				type="text"
				bind:value={hostname}
				disabled={submitting}
				placeholder="https://example.com"
				color={!isUrlValid && hostname ? 'red' : undefined}
			/>
			{#if !isUrlValid && hostname}
				<Helper color="red">Please enter a valid URL (must start with http:// or https://)</Helper>
			{/if}
		</div>

		{#if error}
			<Alert color="red"><ErrorList {error} /></Alert>
		{/if}

		<Button
			type="submit"
			disabled={!canCreate}
			class="w-full"
			spinnerProps={{ type: 'dots', size: '5', color: 'teal' }}
			loading={submitting}
			size="lg"
			>Create Order
		</Button>
	</form>
</Card>

{#if createdOrder}
	<CalculateModal bind:open={showModelSelection} order={createdOrder} />
{/if}
