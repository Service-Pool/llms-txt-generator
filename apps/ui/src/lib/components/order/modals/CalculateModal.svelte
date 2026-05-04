<script lang="ts">
	import { Modal, Button, Spinner, P, Badge } from 'flowbite-svelte';
	import { ordersService } from '$lib/services/orders.service';
	import { ordersStore } from '$lib/stores/orders.store.svelte';
	import DelayedRender from '$lib/components/ui/delayed-render.svelte';
	import ModelSelector from '$lib/components/order/ModelSelector.svelte';
	import StrategySelector from '$lib/components/order/StrategySelector.svelte';
	import type { OrderResponseDto, CreateOrderResponseDto, AiModelResponseDto } from '@api/shared';
	import { GenerationStrategy } from '@api/shared';

	interface Props {
		order: OrderResponseDto | CreateOrderResponseDto;
		open?: boolean;
		onSuccess?: () => void;
		onClose?: () => void;
	}

	let { order, open = $bindable(false), onSuccess, onClose }: Props = $props();

	const label = $derived(
		'currentAiModel' in order.attributes && order.attributes.currentAiModel ? 'Update parameters' : 'Set parameters'
	);

	let availableModels = $state<AiModelResponseDto[]>([]);
	let isLoadingModels = $state(false);
	let selectedModelId = $state<string | null>(null);
	let selectedStrategy = $state<GenerationStrategy | null>(null);
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
			const response = await ordersService.getAvailableModels(order.attributes.id);
			const data = response.getData();
			if (data) {
				availableModels = data;
				if (!selectedModelId && 'currentAiModel' in order.attributes && order.attributes.currentAiModel) {
					selectedModelId = order.attributes.currentAiModel.id;
				}
				if (!selectedStrategy && 'strategy' in order.attributes && order.attributes.strategy) {
					selectedStrategy = order.attributes.strategy;
				}
			}
		} catch (exception) {
			throw exception;
		} finally {
			isLoadingModels = false;
		}
	};

	const handleCalculate = async () => {
		if (!selectedModelId || !selectedStrategy) {
			return;
		}

		isCalculating = true;

		try {
			const response = await ordersService.calculate(order.attributes.id, selectedModelId, selectedStrategy);
			const updatedOrder = response.getData();

			ordersStore.updateOrder(updatedOrder);
			ordersStore.broadcastOrderUpdated(updatedOrder);
			if (onSuccess) {
				onSuccess();
			}
		} catch (exception) {
			throw exception;
		} finally {
			isCalculating = false;
			handleClose();
		}
	};

	const handleClose = () => {
		if (!isCalculating) {
			open = false;
			if (onClose) {
				onClose();
			}
		}
	};
</script>

<Modal
	permanent={isCalculating}
	title="{label}{isLoadingModels ? ' - Loading...' : ''}"
	size="lg"
	bind:open
	onclose={handleClose}
	dismissable={!isCalculating}
	outsideclose={!isCalculating}
	class="max-w-[min(1024px,calc(100vw-2rem))]!"
	classes={{ body: 'space-y-4' }}
>
	{#if isLoadingModels}
		<div class="flex justify-center py-8">
			<DelayedRender>
				<Spinner size="10" />
			</DelayedRender>
		</div>
	{:else if availableModels.length === 0}
		<P class="text-sm text-gray-500">No models available</P>
	{:else}
		<Badge rounded color="gray">AI Model</Badge>
		<ModelSelector
			{availableModels}
			{selectedModelId}
			disabled={isCalculating}
			onSelect={(modelId: string) => (selectedModelId = modelId)}
		/>

		<Badge rounded color="gray">Strategy</Badge>
		<StrategySelector
			{selectedStrategy}
			disabled={isCalculating}
			onSelect={(strategy) => (selectedStrategy = strategy)}
		/>
	{/if}

	{#snippet footer()}
		<Button onclick={handleClose} color="alternative" class="ml-auto">Cancel</Button>
		<Button
			onclick={handleCalculate}
			disabled={!selectedModelId || !selectedStrategy}
			loading={isCalculating}
			color="purple"
		>
			{label}
		</Button>
	{/snippet}
</Modal>
