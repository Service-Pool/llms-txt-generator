<script lang="ts">
	import { Card, Badge } from 'flowbite-svelte';
	import { formatNumber } from '$lib/utils/number-format';
	import { type OrderResponseDto, OrderStatus } from '@api/shared';
	import OrderStatusBadge from './OrderStatusBadge.svelte';
	import ProgressBar from '$lib/components/ui/progress-bar.svelte';
	import { EditOutline } from 'flowbite-svelte-icons';
	import { configService } from '$lib/services/config.service';

	interface Props {
		order: OrderResponseDto;
		class?: string;
		children?: import('svelte').Snippet;
		headerActions?: import('svelte').Snippet;
		showEditLink?: boolean;
	}

	let { order, class: className = '', children, headerActions, showEditLink = true }: Props = $props();

	const metadataItems = $derived.by(() => {
		const items: string[] = [];

		if (order.attributes.totalUrls) {
			items.push(`${formatNumber(order.attributes.totalUrls)} urls`);
		}
		if (order.attributes.currentAiModel) {
			items.push(order.attributes.currentAiModel.displayName);
		}
		if (order.attributes.priceTotal != null) {
			items.push(`${order.attributes.currencySymbol} ${formatNumber(order.attributes.priceTotal)}`);
		}

		return items;
	});
</script>

<Card class="max-w-none p-4 relative {className}">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<!-- Header -->
		<div class="flex-1">
			<!-- Hostname with Status -->
			<div class="flex items-baseline gap-2 mb-2 flex-wrap">
				<h3 class="text-sm font-semibold truncate">
					<Badge color="gray" class="px-2 mr-1">#{order.attributes.id}</Badge>{order.attributes.hostname}
				</h3>
				<OrderStatusBadge status={order.attributes.status} />
				{#if showEditLink}
					<a
						href={configService.routes.orderById(order.attributes.id)}
						class="inline-flex items-center text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-500 transition-all duration-200 hover:scale-110"
						title="Open order details"
						aria-label="Open order details"
					>
						<EditOutline size="sm" class="transition-transform duration-200 hover:rotate-12" />
					</a>
				{/if}
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
