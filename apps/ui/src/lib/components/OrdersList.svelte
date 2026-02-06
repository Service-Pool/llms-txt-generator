<script lang="ts">
	import type { OrderResponseDto } from '@api/shared';
	import OrderListItem from './OrderListItem.svelte';
	import { Heading } from 'flowbite-svelte';
	import { FileLinesOutline } from 'flowbite-svelte-icons';

	interface Props {
		items: OrderResponseDto[];
	}

	let { items = [] }: Props = $props();
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
			{#each items as order (order.id)}
				<OrderListItem {order} />
			{/each}
		</div>
	{/if}
</div>
