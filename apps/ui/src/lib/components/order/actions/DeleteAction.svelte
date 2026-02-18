<script lang="ts">
	import { Button, SpeedDialButton } from 'flowbite-svelte';
	import { getActionConfig } from '$lib/components/order-actions.config';
	import { ordersStore } from '$lib/stores/orders.store.svelte';
	import type { OrderResponseDto } from '@api/shared';

	const config = getActionConfig('delete')!;

	interface Props {
		order: OrderResponseDto;
		mode?: 'card' | 'spd-button';
		loading?: boolean;
	}

	let { order, mode = 'card', loading = false }: Props = $props();

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

{#if mode === 'spd-button'}
	<!-- Button mode for SpeedDial -->
	<SpeedDialButton
		name={config.label}
		color={config.color}
		class="w-10 h-10 shadow-md"
		pill
		onclick={handleDelete}
		disabled={loading || isDeleting}
	>
		<config.icon size="md" />
	</SpeedDialButton>
{:else}
	<!-- Card mode for accordion -->
	<div class="p-4 rounded-lg border {config.cardBgClass}">
		<div class="flex items-center justify-between">
			<div>
				<div class="font-semibold text-gray-900 dark:text-white">
					<config.icon size="sm" class="inline me-2 {config.iconColorClass}" />
					{config.description}
				</div>
				<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Remove this order from your list</p>
			</div>
			<Button
				onclick={handleDelete}
				color={config.color}
				size="sm"
				class="min-w-25 whitespace-nowrap"
				loading={loading || isDeleting}>{config.label}</Button
			>
		</div>
	</div>
{/if}
