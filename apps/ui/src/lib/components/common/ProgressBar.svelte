<script lang="ts">
	interface Props {
		current: number;
		total: number;
		showPercentage?: boolean;
		showNumbers?: boolean;
		size?: 'sm' | 'md' | 'lg';
	}

	let { current = 0, total = 100, showPercentage = true, showNumbers = true, size = 'md' }: Props = $props();

	const percentage = $derived(total > 0 ? Math.round((current / total) * 100) : 0);

	const heightClass = $derived(
		size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-4' : 'h-2.5'
	);
</script>

<div class="w-full">
	{#if showNumbers || showPercentage}
		<div class="flex justify-between mb-1 text-sm">
			{#if showNumbers}
				<span class="text-gray-700 dark:text-gray-300">
					{current} / {total}
				</span>
			{/if}
			{#if showPercentage}
				<span class="text-gray-700 dark:text-gray-300 font-medium">
					{percentage}%
				</span>
			{/if}
		</div>
	{/if}

	<div class="w-full bg-gray-200 rounded-full dark:bg-gray-700 {heightClass}">
		<div
			class="bg-blue-600 {heightClass} rounded-full transition-all duration-300 ease-in-out"
			style="width: {percentage}%"
		></div>
	</div>
</div>
