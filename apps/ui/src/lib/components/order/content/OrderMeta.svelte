<script lang="ts">
	import type { OrderResponseDto } from '@api/shared';
	import { formatNumber } from '$lib/utils/number-format';

	interface Props {
		order: OrderResponseDto;
		class?: string;
	}

	let { order, class: className = '' }: Props = $props();

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

<!--
  OrderMeta

  Content component - metadata (urls, model, price).
  НЕ содержит бизнес-логику, только визуализацию.
-->
<div class="flex flex-wrap items-center gap-2 whitespace-nowrap capitalize text-xs opacity-75 {className}">
	{#each metadataItems as item, i}
		<span>{item}</span>
		{#if i < metadataItems.length - 1}
			<span>•</span>
		{/if}
	{/each}
</div>
