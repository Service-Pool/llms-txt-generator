<script lang="ts">
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	import { Card, Accordion, AccordionItem } from 'flowbite-svelte';

	interface Props {
		class?: string;
		isExpanded?: boolean;
		header?: Snippet;
		meta?: Snippet;
		actionsTrigger?: Snippet;
		expandableContent?: Snippet;
	}

	let { class: className = '', isExpanded = false, header, meta, actionsTrigger, expandableContent }: Props = $props();
</script>

<!--
  OrderListItemLayout

  ПРАВИЛА:
  ✅ ТОЛЬКО структура (header + meta + actions-trigger + expandable-content)
  ✅ БЕЗ стилей на root (<Card class={className}> - стили снаружи!)
  ✅ БЕЗ бизнес-логики (не проверяет статус, не решает что показывать)
  ✅ НЕ знает о данных (order передаётся для type safety, но не используется)
  ✅ Управляет expand/collapse через props (isExpanded, onToggle)
  ❌ НЕ содержит конкретные компоненты (OrderBadge, OrderStatus и т.д.)
  ❌ НЕ решает что рендерить (это решает вызывающий код через slots)

  Используется на странице /orders для списка заказов
-->
<Card class="max-w-none relative {className}">
	<div class="flex flex-wrap items-start justify-between gap-2">
		<!-- Header + Meta Section -->
		<div class="flex-1 space-y-2">
			{#if header}
				<div class="order-list-item-header">
					{@render header()}
				</div>
			{/if}

			{#if meta}
				<div class="order-list-item-meta">
					{@render meta()}
				</div>
			{/if}
		</div>

		<!-- Actions Trigger (SpeedDial) -->
		{#if actionsTrigger}
			<div class="shrink-0 flex gap-3">
				{@render actionsTrigger()}
			</div>
		{/if}
	</div>

	<!-- Expandable Content (Stats, etc.) -->
	{#if expandableContent}
		<Accordion flush>
			<AccordionItem
				open={isExpanded}
				transitionType={slide}
				transitionParams={{ duration: 100 }}
				classes={{
					button: 'hidden',
					content: 'border-b-0 py-0',
					active: 'bg-transparent border-t border-gray-200 dark:border-gray-700 pt-4'
				}}
			>
				{@render expandableContent()}
			</AccordionItem>
		</Accordion>
	{/if}
</Card>
