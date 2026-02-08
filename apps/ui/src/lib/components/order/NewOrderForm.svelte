<script lang="ts">
	import { Card, Input, Label, Button, Helper, Alert } from 'flowbite-svelte';
	import { goto } from '$app/navigation';
	import { ordersService } from '$lib/services/orders.service';
	import { configService } from '$lib/services/config.service';
	import { UIError } from '$lib/errors/ui-error';
	import ErrorList from '$lib/components/general/ErrorList.svelte';
	import Spinner from '$lib/components/general/Spinner.svelte';
	import CalculateAction from './actions/CalculateAction.svelte';
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
			const fullOrderResponse = await ordersService.getById(createdOrder.id);
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

	const handleModelSelected = () => {
		if (createdOrder) {
			goto(configService.routes.orderById(createdOrder.id));
		}
	};

	const resetForm = () => {
		hostname = '';
		error = null;
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
				color={!isUrlValid && hostname ? 'red' : undefined}
			/>
			{#if !isUrlValid && hostname}
				<Helper color="red">Please enter a valid URL (must start with http:// or https://)</Helper>
			{/if}
		</div>

		{#if error}
			<Alert color="red"><ErrorList {error} /></Alert>
		{/if}

		<Button type="submit" disabled={!canCreate} class="w-full">
			{#if submitting}
				Creating
				<Spinner type="dots" size="5" class="mx-4 fill-white" />
			{:else}
				Create Order
			{/if}
		</Button>
	</form>
</Card>

{#if createdOrder}
	<CalculateAction order={createdOrder} bind:open={showModelSelection} showButton={false} onUpdate={handleModelSelected} />
{/if}
