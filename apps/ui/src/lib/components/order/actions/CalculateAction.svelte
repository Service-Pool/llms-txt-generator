<script lang="ts">
	import { Button, Card } from 'flowbite-svelte';
	import { ChartMixedDollarSolid, CheckCircleSolid } from 'flowbite-svelte-icons';
	import { ordersService } from '$lib/services/orders.service';
	import type { OrderResponseDto, AvailableAiModelDto } from '@api/shared';

	interface Props {
		order: OrderResponseDto;
		onUpdate?: () => void;
	}

	let { order, onUpdate }: Props = $props();

	let availableModels = $state<AvailableAiModelDto[]>([]);
	let isLoadingModels = $state(false);
	let selectedModelId = $state<string | null>(null);
	let isCalculating = $state(false);

	// Load available models when component mounts
	$effect(() => {
		if (availableModels.length === 0) {
			loadAvailableModels();
		}
	});

	const loadAvailableModels = async () => {
		isLoadingModels = true;
		try {
			const response = await ordersService.getAvailableModels(order.id);
			const data = response.getData();
			if (data) {
				availableModels = data;
			}
		} catch (error) {
			console.error('Failed to load models:', error);
		} finally {
			isLoadingModels = false;
		}
	};

	const handleCalculate = async (modelId: string) => {
		if (!modelId) return;
		isCalculating = true;
		selectedModelId = modelId;
		try {
			// TODO: Implement calculate API call
			console.log('Calculate with model:', modelId);
			onUpdate?.();
		} catch (error) {
			console.error('Calculate failed:', error);
		} finally {
			isCalculating = false;
		}
	};
</script>

<h3 class="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
	<ChartMixedDollarSolid class="w-5 h-5 inline me-2 text-purple-600 dark:text-purple-400" />
	Select AI Model
</h3>

{#if isLoadingModels}
	<p class="text-sm text-gray-500">Loading available models...</p>
{:else if availableModels.length === 0}
	<p class="text-sm text-gray-500">No models available</p>
{:else}
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		{#each availableModels as model}
			<Card
				class="max-w-none p-4 h-full flex flex-col relative overflow-hidden {selectedModelId === model.id
					? 'ring-2 ring-purple-500'
					: ''}"
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
								<CheckCircleSolid class="text-purple-600 h-4 w-4 shrink-0 mt-0.5" />
								<span class="text-sm text-gray-700 dark:text-gray-300">
									{model.description}
								</span>
							</li>
						{/if}
						{#if model.pageLimit}
							<li class="flex items-start space-x-2">
								<CheckCircleSolid class="text-purple-600 h-4 w-4 shrink-0 mt-0.5" />
								<span class="text-sm text-gray-700 dark:text-gray-300">
									Up to {model.pageLimit} pages
								</span>
							</li>
						{/if}
					</ul>
				</div>

				<!-- Action Button -->
				<Button
					onclick={() => handleCalculate(model.id)}
					disabled={!model.available || isCalculating}
					color="purple"
					class="mt-4 w-full relative z-10"
				>
					{#if isCalculating && selectedModelId === model.id}
						Calculating...
					{:else if !model.available}
						{model.unavailableReason || 'Unavailable'}
					{:else}
						Select Model
					{/if}
				</Button>
			</Card>
		{/each}
	</div>

	{#if order.totalUrls}
		<p class="text-xs text-gray-500 dark:text-gray-400 mt-3">
			Price calculated for {order.totalUrls} URLs
		</p>
	{/if}
{/if}
