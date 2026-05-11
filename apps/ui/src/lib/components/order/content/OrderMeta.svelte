<script lang="ts">
	import type { OrderResponseDto } from '@api/shared';
	import { formatNumber, formatPrice } from '$lib/utils/number-format';

	interface Props {
		order: OrderResponseDto;
		class?: string;
	}

	let { order, class: className = '' }: Props = $props();

	const metadataItems = $derived.by(() => {
		const items: string[] = [];

		if (order.attributes.urlsTotal) {
			items.push(`${formatNumber(order.attributes.urlsTotal)} Urls (total)`);
		}
		if (order.attributes.urlListFilter != null) {
			items.push(`filter: ${order.attributes.urlListFilter}`);
		} else if (order.attributes.urlsTotal) {
			items.push('filter: none');
		}
		if (order.attributes.progress?.processedUrls) {
			items.push(`${formatNumber(order.attributes.progress.processedUrls)} Urls (processed)`);
		}
		if (order.attributes.currentAiModel) {
			items.push(order.attributes.currentAiModel.displayName);
		}
		if (order.attributes.priceTotal != null) {
			items.push(`${order.attributes.currencySymbol} ${formatPrice(order.attributes.priceTotal)}`);
		}

		return items;
	});
</script>

<!--
  OrderMeta

  Content component - metadata (urls, model, price).
  НЕ содержит бизнес-логику, только визуализацию.
-->
<div class="flex flex-wrap items-center gap-2 whitespace-nowrap text-xs opacity-75 {className}">
	{#each metadataItems as item, i}
		<span>{item}</span>
		{#if i < metadataItems.length - 1}
			<span>•</span>
		{/if}
	{/each}
</div>

