<script lang="ts">
	import { Progressbar } from 'flowbite-svelte';
	import { type ProgressbarProps } from 'flowbite-svelte';

	interface Props {
		current: number;
		total: number;
		showPercentage?: boolean;
		showNumbers?: boolean;
		size?: ProgressbarProps['size'];
	}

	let { current = 0, total = 100, showPercentage = true, showNumbers = true, size = 'h-2.5' }: Props = $props();

	const percentage = $derived(total > 0 ? Math.round((current / total) * 100) : 0);
</script>

<div class="w-full">
	{#if showNumbers || showPercentage}
		<div class="flex justify-between mb-1 text-sm opacity-75">
			{#if showNumbers}
				<span>
					{current} / {total}
				</span>
			{/if}
			{#if showPercentage}
				<span class="font-medium">
					{percentage}%
				</span>
			{/if}
		</div>
	{/if}

	<Progressbar progress={percentage.toString()} {size} color="primary" />
</div>
