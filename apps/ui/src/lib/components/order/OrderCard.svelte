<script lang="ts">
	import { Card, Badge } from 'flowbite-svelte';
	import { formatNumber } from '$lib/utils/number-format';
	import { type OrderResponseDto, OrderStatus } from '@api/shared';
	import OrderStatusBadge from './OrderStatusBadge.svelte';
	import ProgressBar from '$lib/components/general/ProgressBar.svelte';

	interface Props {
		order: OrderResponseDto;
		class?: string;
		children?: import('svelte').Snippet;
		headerActions?: import('svelte').Snippet;
	}

	let { order, class: className = '', children, headerActions }: Props = $props();

	const formattedDate = $derived(
		order.attributes.createdAt ? new Date(order.attributes.createdAt).toLocaleString() : '-'
	);

	const metadataItems = $derived.by(() => {
		const items: string[] = [];

		if (order.attributes.createdAt) {
			items.push(formattedDate);
		}
		if (order.attributes.totalUrls) {
			items.push(`${formatNumber(order.attributes.totalUrls)} urls`);
		}
		if (order.attributes.currentAiModel) {
			items.push(order.attributes.currentAiModel.displayName);
		}
		if (order.attributes.priceTotal) {
			items.push(`${order.attributes.currencySymbol} ${formatNumber(order.attributes.priceTotal)}`);
		}

		return items;
	});
</script>

<Card class="max-w-none p-4 {className}">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<!-- Header -->
		<div class="flex-1">
			<!-- Hostname with Status -->
			<div class="flex items-baseline gap-2 mb-2 flex-wrap">
				<h3 class="text-sm font-semibold truncate">
					<Badge color="gray" class="px-2 mr-1">#{order.attributes.id}</Badge>{order.attributes.hostname}
				</h3>
				<OrderStatusBadge status={order.attributes.status} />
			</div>
		</div>

		<!-- Header Actions slot -->
		{#if headerActions}
			<div class="shrink-0 flex gap-2">
				{@render headerActions()}
			</div>
		{/if}
	</div>

	<!-- Provider & Metadata in one line -->
	<div class="flex flex-wrap items-center gap-2 whitespace-nowrap capitalize text-xs opacity-75">
		{#each metadataItems as item, i}
			<span>{item}</span>
			{#if i < metadataItems.length - 1}
				<span>•</span>
			{/if}
		{/each}
	</div>

	<!-- Progress Bar for Active Generations -->
	{#if order.attributes.status === OrderStatus.PROCESSING}
		<div class="mt-3">
			<ProgressBar
				label="URLs"
				current={order.attributes.processedUrls}
				total={order.attributes.totalUrls!}
				size="h-1.5"
				showNumbers={true}
			/>
		</div>
	{/if}

	<!-- Content slot -->
	{#if children}
		<div class="mt-4">
			{@render children()}
		</div>
	{/if}
</Card>
