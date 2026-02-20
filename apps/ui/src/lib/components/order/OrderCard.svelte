<script lang="ts">
	import { Card, Badge } from 'flowbite-svelte';
	import { configService } from '$lib/services/config.service';
	import { EditOutline } from 'flowbite-svelte-icons';
	import { formatNumber } from '$lib/utils/number-format';
	import { type OrderResponseDto } from '@api/shared';
	import OrderStatusBadge from './OrderStatusBadge.svelte';

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

<Card class="max-w-none relative {className}">
	<div class="flex flex-wrap items-start justify-between gap-6">
		<!-- Header -->
		<div class="flex-1">
			<!-- Hostname with Status -->
			<div class="flex items-center gap-2 mb-2">
				<h3 class="text-sm font-semibold truncate">
					<Badge color="gray" class="px-2 mr-1">#{order.attributes.id}</Badge>{order.attributes.hostname}
				</h3>
				{#if showEditLink}
					<a
						href={configService.routes.orderById(order.attributes.id)}
						class="inline-flex items-center transition-transform duration-200 hover:translate-x-0.5"
						title="Open order details"
						aria-label="Open order details"
					>
						<OrderStatusBadge status={order.attributes.status}>
							{#snippet icon()}
								<EditOutline size="sm" />
							{/snippet}
						</OrderStatusBadge>
					</a>
				{:else}
					<OrderStatusBadge status={order.attributes.status} />
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
		</div>

		<!-- Header Actions slot -->
		{#if headerActions}
			<div class="shrink-0 flex gap-2">
				{@render headerActions()}
			</div>
		{/if}
	</div>

	<!-- Content slot -->
	{#if children}
		<div class="mt-4">
			{@render children()}
		</div>
	{/if}
</Card>
