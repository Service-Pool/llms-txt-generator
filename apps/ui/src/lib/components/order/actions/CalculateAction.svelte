<script lang="ts">
	import { Button, Card, Modal } from 'flowbite-svelte';
	import { CheckCircleSolid } from 'flowbite-svelte-icons';
	import { ordersService } from '$lib/services/orders.service';
	import type { OrderResponseDto, CreateOrderResponseDto, AvailableAiModelDto } from '@api/shared';
	import { getActionConfig } from '$lib/config/order-actions.config';

	interface Props {
		order: OrderResponseDto | CreateOrderResponseDto;
		onUpdate?: () => void;
		open?: boolean;
		showButton?: boolean;
	}

	let { order, onUpdate, open = $bindable(false), showButton = true }: Props = $props();

	const config = getActionConfig('calculate')!;

	let availableModels = $state<AvailableAiModelDto[]>([]);
	let isLoadingModels = $state(false);
	let selectedModelId = $state<string | null>(null);
	let isCalculating = $state(false);

	// Load available models when modal opens
	$effect(() => {
		if (open && availableModels.length === 0) {
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
		} catch (exception) {
			throw exception;
		} finally {
			isLoadingModels = false;
		}
	};

	const handleCalculate = async () => {
		if (!selectedModelId) return;
		isCalculating = true;
		try {
			const response = await ordersService.calculate(order.id, selectedModelId);
			const updatedOrder = response.getData();
			if (updatedOrder) {
				open = false;
				onUpdate?.();
			}
		} catch (exception) {
			throw exception;
		} finally {
			isCalculating = false;
		}
	};

	const handleAction = ({ action }: { action: string }) => {
		if (action === 'calculate') {
			handleCalculate();
		} else {
			open = false;
		}
	};
</script>

{#if showButton}
	<div class="p-4 rounded-lg border {config.cardBgClass}">
		<div class="flex items-center justify-between">
			<div>
				<div class="font-semibold text-gray-900 dark:text-white">
					<config.icon class="w-4 h-4 inline me-2 {config.iconColorClass}" />
					{config.description}
				</div>
				<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
					Current: <span class="font-semibold">{order.currentAiModel?.displayName ?? '—'}</span>
				</p>
			</div>
			<Button onclick={() => (open = true)} color={config.color} size="sm" class="min-w-25 whitespace-nowrap"
				>{config.label}</Button
			>
		</div>
	</div>
{/if}

<Modal
	form
	permanent
	title="{config.label} - Select AI Model"
	size="lg"
	bind:open
	onaction={handleAction}
	class="max-w-[min(1024px,calc(100vw-2rem))]!"
>
	{#if isLoadingModels}
		<p class="text-sm text-gray-500">Loading available models...</p>
	{:else if availableModels.length === 0}
		<p class="text-sm text-gray-500">No models available</p>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			{#each availableModels as model}
				<Card
					class="max-w-none p-4 h-full flex flex-col relative overflow-hidden cursor-pointer transition-all {selectedModelId ===
					model.id
						? 'ring-2 ring-purple-500'
						: 'hover:ring-2 hover:ring-gray-300'}"
					onclick={() => model.available && (selectedModelId = model.id)}
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

						{#if !model.available}
							<p class="text-sm text-red-600 dark:text-red-400">
								{model.unavailableReason || 'Unavailable'}
							</p>
						{/if}
					</div>
				</Card>
			{/each}
		</div>

		{#if order.totalUrls}
			<p class="text-xs text-gray-500 dark:text-gray-400 mt-3">
				Price calculated for {order.totalUrls} URLs
			</p>
		{/if}
	{/if}

	{#snippet footer()}
		<Button type="submit" value="calculate" disabled={!selectedModelId || isCalculating} color={config.color}>
			{#if isCalculating}
				Calculating...
			{:else}
				{config.label}
			{/if}
		</Button>
		<Button type="submit" value="cancel" color="alternative">Cancel</Button>
	{/snippet}
</Modal>
