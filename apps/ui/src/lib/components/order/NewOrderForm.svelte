<script lang="ts">
	import { Card, Input, Label, Button, Helper, Alert, Spinner, P } from 'flowbite-svelte';
	import { ClockSolid, ArrowLeftOutline } from 'flowbite-svelte-icons';
	import { goto } from '$app/navigation';
	import { onMount, untrack } from 'svelte';
	import { quintOut } from 'svelte/easing';
	import { scale, fly } from 'svelte/transition';
	import { ordersService } from '$lib/services/orders.service';
	import { ordersStore } from '$lib/stores/orders.store.svelte';
	import { statsStore } from '$lib/stores/stats.store.svelte';
	import { UIError } from '$lib/errors/ui-error';
	import CompletedStats from '$lib/components/order/CompletedStats.svelte';
	import DelayedRender from '$lib/components/ui/delayed-render.svelte';
	import ErrorList from '$lib/components/ui/error-list.svelte';
	import ModelSelector from '$lib/components/order/ModelSelector.svelte';
	import type { OrderResponseDto, AvailableAiModelDto } from '@api/shared';

	// State management
	let step = $state<'domain-input' | 'model-selection'>('domain-input');
	let createdOrder = $state<OrderResponseDto | null>(null);
	let availableModels = $state<AvailableAiModelDto[]>([]);
	let isCalculating = $state(false);
	let selectedModelId = $state<string | null>(null);
	let isLoadingModels = $state(false);

	// Form state
	let hostname = $state('');
	let submitting = $state(false);
	let error = $state<string[] | string | null>(null);

	// Element ref
	let cardEl: HTMLElement | undefined;

	// Auto-scroll to bottom of Card when models appear
	$effect(() => {
		if (step === 'model-selection' && availableModels.length > 0) {
			// Small delay to ensure DOM is fully rendered and transitions complete
			setTimeout(() => {
				// Use untrack to read cardEl without creating reactive dependency
				untrack(() => {
					cardEl?.scrollIntoView({ behavior: 'smooth', block: 'end' });
				});
			}, 100);
		}
	});

	onMount(async () => {
		await statsStore.init(); // Initialize stats: fetch value and connect to WebSocket
	});

	const isUrlValid = $derived(/^https?:\/\/.+/.test(hostname));
	const canCreate = $derived(isUrlValid && !submitting);

	// Handlers
	const handleSubmit = async (e: Event) => {
		e.preventDefault();

		if (!canCreate) return;

		try {
			submitting = true;
			error = null;
			isLoadingModels = true;

			const response = await ordersService.create({ hostname });
			const createOrderDto = response.getData();

			// Load full order data
			const fullOrderResponse = await ordersService.getById(createOrderDto.attributes.id);
			createdOrder = fullOrderResponse.getData();

			// Broadcast to other tabs
			ordersStore.broadcastOrderCreated(createdOrder);

			// Load available models
			const modelsResponse = await ordersService.getAvailableModels(createdOrder.attributes.id);
			const data = modelsResponse.getData();
			if (data) {
				availableModels = data;
			}

			// Reset form
			hostname = '';
			error = null;

			step = 'model-selection';
		} catch (exception) {
			if (exception instanceof UIError) {
				error = exception.context;
			} else if (exception instanceof Error) {
				error = exception.message;
			}
			throw exception;
		} finally {
			submitting = false;
			isLoadingModels = false;
		}
	};

	const handleModelSelect = (modelId: string) => {
		selectedModelId = modelId;
	};

	const handleSetModel = async () => {
		if (!createdOrder || !selectedModelId) return;

		isCalculating = true;

		try {
			const response = await ordersService.calculate(createdOrder.attributes.id, selectedModelId);
			const updatedOrder = response.getData();

			// Update store and broadcast to other tabs
			ordersStore.updateOrder(updatedOrder);
			ordersStore.broadcastOrderUpdated(updatedOrder);

			goto(`/orders/${createdOrder.attributes.id}`);
		} catch (error) {
			isCalculating = false;
			throw error;
		}
	};

	const startOver = () => {
		step = 'domain-input';
		createdOrder = null;
		availableModels = [];
		isCalculating = false;
		selectedModelId = null;
		hostname = '';
		error = null;
	};
</script>

<div bind:this={cardEl}>
	<Card size="xl" class="p-4 sm:p-6 md:p-8">
		{#if step === 'domain-input'}
			<div class="flex flex-wrap gap-2 items-center justify-between mb-4">
				<h2 class="text-2xl font-bold whitespace-nowrap">Create New Order</h2>
				<CompletedStats />
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
		{:else if step === 'model-selection'}
			<div in:scale={{ duration: 500, start: 0, easing: quintOut }} out:fly={{ y: -50, duration: 200 }}>
				<div class="flex justify-between items-start mb-6">
					<div>
						<h2 class="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Select AI Model</h2>
						<P space="tight" size="xs" height="6" class="text-gray-600 dark:text-gray-400 mb-1">
							<span>Order <strong>#{createdOrder?.attributes.id}</strong></span>
							<span>•</span>
							<span>{createdOrder?.attributes.totalUrls} URLs</span>
							<span>•</span>
							<span class="font-semibold">{createdOrder?.attributes.hostname}</span>
						</P>

						<P space="tight" size="xs" height="6" class="flex items-center gap-1">
							<ClockSolid class="w-3 h-3 text-amber-600 dark:text-amber-400" />
							<span>The order will be deleted in 15 minutes if no model is selected</span>
						</P>
					</div>
				</div>

				{#if isLoadingModels}
					<div class="flex justify-center py-8">
						<DelayedRender>
							<Spinner size="10" />
						</DelayedRender>
					</div>
				{:else if availableModels.length === 0}
					<p class="text-sm text-gray-500 text-center py-8">No models available</p>
				{:else}
					<ModelSelector
						{availableModels}
						{selectedModelId}
						disabled={isCalculating}
						showSpinnerOnSelected={true}
						onSelect={handleModelSelect}
						class="mb-6"
					/>

					<div class="mt-6 flex justify-end gap-2">
						<Button color="light" size="sm" disabled={isCalculating} onclick={startOver}>
							<ArrowLeftOutline size="sm" class="me-2" />
							<span>Start Over</span>
						</Button>
						<Button onclick={handleSetModel} disabled={!selectedModelId || isCalculating} color="purple" size="sm">
							{#if isCalculating}
								<Spinner size="5" class="me-2" />
								Calculating...
							{:else}
								Set Model
							{/if}
						</Button>
					</div>
				{/if}
			</div>
		{/if}
	</Card>
</div>
