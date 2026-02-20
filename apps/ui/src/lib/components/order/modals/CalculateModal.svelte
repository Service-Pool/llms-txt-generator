<script lang="ts">
	import { Modal, Button, Spinner } from 'flowbite-svelte';
	import { ordersService } from '$lib/services/orders.service';
	import { ordersStore } from '$lib/stores/orders.store.svelte';
	import DelayedRender from '$lib/components/ui/delayed-render.svelte';
	import ModelSelector from '$lib/components/order/ModelSelector.svelte';
	import type { OrderResponseDto, CreateOrderResponseDto, AvailableAiModelDto } from '@api/shared';
	import { getActionConfig } from '$lib/components/order-actions.config';

	interface Props {
		order: OrderResponseDto | CreateOrderResponseDto;
		open?: boolean;
		onSuccess?: () => void;
		onClose?: () => void;
	}

	let { order, open = $bindable(false), onSuccess, onClose }: Props = $props();

	const config = getActionConfig('calculate')!;
	const label = $derived(
		'currentAiModel' in order.attributes && order.attributes.currentAiModel ? config.labelAlternative : config.label
	);

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
			const response = await ordersService.getAvailableModels(order.attributes.id);
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
		if (!selectedModelId) {
			return;
		}

		isCalculating = true;

		try {
			const response = await ordersService.calculate(order.attributes.id, selectedModelId);
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
	bodyClass="space-y-4"
	class="max-w-[min(1024px,calc(100vw-2rem))]!"
>
	{#if isLoadingModels}
		<div class="flex justify-center py-8">
			<DelayedRender>
				<Spinner size="10" />
			</DelayedRender>
		</div>
	{:else if availableModels.length === 0}
		<p class="text-sm text-gray-500">No models available</p>
	{:else}
		<ModelSelector
			{availableModels}
			{selectedModelId}
			disabled={isCalculating}
			onSelect={(modelId) => (selectedModelId = modelId)}
		/>

		{#if order.attributes.totalUrls}
			<p class="text-xs text-gray-500 dark:text-gray-400 mt-3">
				Price calculated for {order.attributes.totalUrls} URLs
			</p>
		{/if}
	{/if}

	{#snippet footer()}
		<Button onclick={handleClose} color="alternative" class="ml-auto">Cancel</Button>
		<Button onclick={handleCalculate} disabled={!selectedModelId} loading={isCalculating} color={config.color}>
			{config.label}
		</Button>
	{/snippet}
</Modal>
