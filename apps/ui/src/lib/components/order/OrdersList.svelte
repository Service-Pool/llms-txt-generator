<script lang="ts">
	import type { OrderResponseDto } from '@api/shared';
	import OrderListItem from './OrderListItem.svelte';
	import { Heading } from 'flowbite-svelte';
	import { FileLinesOutline } from 'flowbite-svelte-icons';
	import { flip } from 'svelte/animate';
	import { scale, fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	interface Props {
		items: OrderResponseDto[];
	}

	let { items = [] }: Props = $props();

	let openOrderId = $state<number | null>(null);

	const toggleOrder = (orderId: number) => {
		openOrderId = openOrderId === orderId ? null : orderId;
	};
</script>

<div class="space-y-4">
	<Heading tag="h2">Your Orders</Heading>

	{#if items.length === 0}
		<div class="text-center py-12 rounded-lg border-2 border-dashed">
			<FileLinesOutline class="mx-auto h-12 w-12 text-gray-400" />
			<p class="mt-4 text-gray-600 dark:text-gray-400">No orders yet. Create your first one above!</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each items as order (order.attributes.id)}
				<div
					animate:flip={{ duration: 400, easing: quintOut }}
					in:scale={{ duration: 500, start: 0, easing: quintOut }}
					out:fly={{ y: -50, duration: 200 }}
				>
					<OrderListItem
						{order}
						isOpen={openOrderId === order.attributes.id}
						anyOrderOpen={openOrderId !== null}
						onToggle={() => toggleOrder(order.attributes.id)}
					/>
				</div>
			{/each}
		</div>
	{/if}
</div>
