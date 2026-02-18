<script lang="ts">
	import { Button, SpeedDialButton } from 'flowbite-svelte';
	import { getActionConfig } from '$lib/components/order-actions.config';
	import { ordersStore } from '$lib/stores/orders.store.svelte';
	import type { OrderResponseDto } from '@api/shared';

	const config = getActionConfig('delete')!;

	interface Props {
		order: OrderResponseDto;
		mode?: 'spd-button' | 'stepper';
		loading?: boolean;
		disabled?: boolean;
	}

	let { order, mode = 'stepper', loading = false, disabled = false }: Props = $props();

	let isDeleting = $state(false);

	const handleDelete = async () => {
		const confirmed = confirm(
			`Are you sure you want to delete order #${order.attributes.id}? This action cannot be undone.`
		);

		if (!confirmed) {
			return;
		}

		isDeleting = true;
		try {
			await ordersStore.deleteOrder(order.attributes.id);
		} catch (exception) {
			throw exception;
		} finally {
			isDeleting = false;
		}
	};
</script>

{#if mode === 'stepper'}
	<!-- Small button mode for stepper -->
	<Button
		size="xs"
		color={config.color}
		onclick={handleDelete}
		disabled={disabled || loading || isDeleting}
		loading={isDeleting}
	>
		<config.icon size="xs" class="me-1.5" />
		{config.label}
	</Button>
{:else if mode === 'spd-button'}
	<!-- Button mode for SpeedDial -->
	<SpeedDialButton
		name={config.label}
		color={config.color}
		class="w-10 h-10 shadow-md"
		pill
		onclick={handleDelete}
		disabled={disabled || loading || isDeleting}
	>
		<config.icon size="md" />
	</SpeedDialButton>
{/if}
