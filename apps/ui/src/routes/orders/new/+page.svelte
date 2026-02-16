<script lang="ts">
	import { Button, Card, Spinner, Input, Label, Helper, Alert, P } from 'flowbite-svelte';
	import { CheckCircleSolid, ClockSolid, ArrowLeftOutline } from 'flowbite-svelte-icons';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { ordersService } from '$lib/services/orders.service';
	import { ordersStore } from '$lib/stores/orders.store.svelte';
	import { quintOut } from 'svelte/easing';
	import { scale, fly } from 'svelte/transition';
	import { statsStore } from '$lib/stores/stats.store.svelte';
	import { UIError } from '$lib/errors/ui-error';
	import CompletedStats from '$lib/components/order/stats/CompletedStats.svelte';
	import DelayedRender from '$lib/components/general/DelayedRender.svelte';
	import ErrorList from '$lib/components/general/ErrorList.svelte';
	import Hero from '$lib/components/general/Hero.svelte';
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
	let completed = $state<number | null>();

	// Subscribe to completedCount store
	$effect(() => {
		const unsubscribe = statsStore.completedCount.subscribe((value) => {
			completed = value;
		});

		return () => unsubscribe();
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
			await ordersService.calculate(createdOrder.attributes.id, selectedModelId);
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

<svelte:head>
	<title>New Order - LLMs.txt Generator</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-6">
	<Hero />

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
							<span>Order <strong>#{createdOrder!.attributes.id}</strong></span>
							<span>•</span>
							<span>{createdOrder!.attributes.totalUrls} URLs</span>
							<span>•</span>
							<span class="font-semibold">{createdOrder!.attributes.hostname}</span>
						</P>

						<P space="tight" size="xs" height="6" class="flex items-center justify-end gap-1">
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
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
						{#each availableModels as model}
							<Card
								class="max-w-none p-4 h-full flex flex-col relative overflow-hidden cursor-pointer {selectedModelId ===
								model.id
									? 'ring-2 ring-purple-500'
									: 'hover:ring-2 hover:ring-gray-300'} {isCalculating
									? 'opacity-50 pointer-events-none'
									: ''} {!model.available ? 'opacity-50 cursor-not-allowed' : ''}"
								onclick={() => model.available && !isCalculating && handleModelSelect(model.id)}
							>
								<div
									class="absolute inset-0 opacity-10 dark:invert"
									style="background-image: url('/pattern.svg'); background-size: cover; background-repeat: repeat;"
								></div>

								<div class="relative z-10 flex-1 space-y-3">
									<!-- Model Name & Category -->
									<div>
										<h5 class="text-lg font-medium text-gray-900 dark:text-white">
											{model.displayName}
											{#if isCalculating && selectedModelId === model.id}
												<Spinner size="4" class="inline-block ml-2" />
											{/if}
										</h5>
										<p class="text-xs text-gray-500 dark:text-gray-400 uppercase">
											{model.category}
										</p>
									</div>

									<!-- Price -->
									{#if model.totalPrice > 0}
										<div class="flex items-baseline">
											<span class="text-2xl font-semibold text-gray-900 dark:text-white">
												{model.currencySymbol}
											</span>
											<span class="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
												{model.totalPrice.toFixed(2)}
											</span>
										</div>
									{:else}
										<div class="text-2xl font-semibold text-gray-900 dark:text-white">Free</div>
									{/if}

									<!-- Features -->
									<ul class="space-y-2">
										{#if model.description}
											<li class="flex items-start space-x-2">
												<CheckCircleSolid size="sm" class="text-purple-600shrink-0 mt-0.5" />
												<span class="text-sm text-gray-700 dark:text-gray-300">
													{model.description}
												</span>
											</li>
										{/if}
										{#if model.pageLimit}
											<li class="flex items-start space-x-2">
												<CheckCircleSolid size="sm" class="text-purple-600 shrink-0 mt-0.5" />
												<span class="text-sm text-gray-700 dark:text-gray-300">
													Up to {model.pageLimit} pages
												</span>
											</li>
										{/if}
										{#if model.totalPrice > 0}
											<li class="flex items-start space-x-2">
												<CheckCircleSolid size="sm" class="text-purple-600 shrink-0 mt-0.5" />
												<span class="text-sm text-gray-700 dark:text-gray-300"> Login required </span>
											</li>
										{/if}
									</ul>

									{#if !model.available}
										<p class="text-sm text-red-600 dark:text-red-400">
											{model.unavailableReason || 'Unavailable'}
										</p>
									{/if}
								</div>
							</Card>
						{/each}
					</div>
					<div class="mt-6 flex justify-end gap-2">
						<Button color="light" size="sm" disabled={isCalculating} onclick={startOver}
							><ArrowLeftOutline size="sm" class="me-2" />
							<span>Start Over</span>
						</Button>
						<Button onclick={handleSetModel} disabled={!selectedModelId || isCalculating} color="primary" size="sm">
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
