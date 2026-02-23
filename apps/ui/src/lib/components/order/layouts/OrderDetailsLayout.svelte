<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		header?: Snippet;
		meta?: Snippet;
		stepper?: Snippet;
		progress?: Snippet;
		stats?: Snippet;
		footer?: Snippet;
	}

	let { class: className = '', header, meta, stepper, progress, stats, footer }: Props = $props();
</script>

<!--
  OrderDetailsLayout

  ПРАВИЛА:
  ✅ ТОЛЬКО структура (header + meta + stepper + progress + stats)
  ✅ БЕЗ стилей на root - стили передаются снаружи
  ✅ БЕЗ бизнес-логики
  ✅ НЕ знает о данных (order передаётся для type safety)
  ❌ НЕ содержит конкретные компоненты
  ❌ НЕ решает что рендерить

  Используется на странице /orders/[id]
-->
<div class="border-none dark:border-none bg-transparent dark:bg-transparent p-0 {className}">
	{#if header}
		<div class="mb-2">
			{@render header()}
		</div>
	{/if}

	{#if meta}
		<div class="mb-2">
			{@render meta()}
		</div>
	{/if}

	{#if stepper}
		<div class="mb-2">
			{@render stepper()}
		</div>
	{/if}

	{#if progress}
		<div class="mb-2">
			{@render progress()}
		</div>
	{/if}

	{#if stats}
		<div class="mb-2">
			{@render stats()}
		</div>
	{/if}

	{#if footer}
		<div class="mb-6 mt-4">
			{@render footer()}
		</div>
	{/if}
</div>
