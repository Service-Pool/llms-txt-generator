<script lang="ts">
	import { Button } from 'flowbite-svelte';
	import { getActionConfig } from '$lib/config/order-actions.config';
	import { ordersService } from '$lib/services/orders.service';
	import { ordersStore } from '$lib/stores/orders.store.svelte';
	import type { OrderResponseDto } from '@api/shared';

	const config = getActionConfig('run')!;

	interface Props {
		order: OrderResponseDto;
		mode?: 'card' | 'button';
		loading?: boolean;
	}

	let { order, mode = 'card', loading = false }: Props = $props();

	let isRunning = $state(false);

	const handleRun = async () => {
		isRunning = true;
		try {
			const response = await ordersService.start(order.attributes.id, order.attributes.currentAiModel!.id);
			const updatedOrder = response.getData();
			if (updatedOrder) {
				ordersStore.updateOrder(updatedOrder);
			}
		} catch (exception) {
			throw exception;
		} finally {
			isRunning = false;
		}
	};
</script>

{#if mode === 'button'}
	<!-- Button mode for SpeedDial -->
	<Button
		size="xs"
		color={config.color}
		pill
		class="justify-start shadow-md whitespace-nowrap"
		onclick={handleRun}
		loading={loading || isRunning}
	>
		<config.icon class="w-5 h-5 me-2" />
		{config.label}
	</Button>
{:else}
	<!-- Card mode for accordion -->
	<div class="p-4 rounded-lg border {config.cardBgClass}">
		<div class="flex items-center justify-between">
			<div>
				<div class="font-semibold text-gray-900 dark:text-white">
					<config.icon class="w-4 h-4 inline me-2 {config.iconColorClass}" />
					{config.description}
				</div>
				<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Start generating LLMs.txt file</p>
			</div>
			<Button onclick={handleRun} color={config.color} size="sm" class="min-w-25 whitespace-nowrap" loading={isRunning}>
				{config.label}
			</Button>
		</div>
	</div>
{/if}
