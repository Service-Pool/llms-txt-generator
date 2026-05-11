<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props<T> {
		items: T[];
		itemHeight?: number;
		height?: string;
		class?: string;
		children: Snippet<[T]>;
	}

	let {
		items,
		itemHeight = 28,
		height = '300px',
		class: className = '',
		children
	}: Props<unknown> = $props();

	let scrollTop = $state(0);
	let containerHeight = $state(0);

	const totalHeight = $derived(items.length * itemHeight);
	const startIndex = $derived(Math.floor(scrollTop / itemHeight));
	const visibleCount = $derived(Math.ceil(containerHeight / itemHeight) + 2);
	const endIndex = $derived(Math.min(startIndex + visibleCount, items.length));
	const visibleItems = $derived(items.slice(startIndex, endIndex));
	const offsetY = $derived(startIndex * itemHeight);
</script>

<div
	class="overflow-y-auto {className}"
	style="height: {height}"
	onscroll={(e) => (scrollTop = (e.currentTarget as HTMLElement).scrollTop)}
	bind:clientHeight={containerHeight}
>
	<div style="height: {totalHeight}px; position: relative;">
		<div style="position: absolute; top: {offsetY}px; width: 100%;">
			{#each visibleItems as item}
				{@render children(item)}
			{/each}
		</div>
	</div>
</div>
