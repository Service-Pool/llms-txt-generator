<script lang="ts">
	import { Button, SpeedDialButton } from 'flowbite-svelte';
	import { getActionConfig } from '$lib/components/order-actions.config';
	import { ordersService } from '$lib/services/orders.service';
	import { ordersStore } from '$lib/stores/orders.store.svelte';
	import type { OrderResponseDto } from '@api/shared';

	const config = getActionConfig('run')!;

	interface Props {
		class?: string;
		order: OrderResponseDto;
		mode?: 'spd-button' | 'stepper';
		loading?: boolean;
		disabled?: boolean;
	}

	let { class: className = '', order, mode = 'stepper', loading = false, disabled = false }: Props = $props();

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

{#if mode === 'stepper'}
	<!-- Small button mode for stepper -->
	<Button
		size="lg"
		color={config.color}
		onclick={handleRun}
		disabled={disabled || loading || isRunning}
		loading={isRunning}
		class="whitespace-nowrap {className}"
	>
		{config.label}
	</Button>
{:else if mode === 'spd-button'}
	<!-- Button mode for SpeedDial -->
	<SpeedDialButton name={config.label} color={config.color} class={className} pill onclick={handleRun}>
		<config.icon size="md" />
	</SpeedDialButton>
{/if}
