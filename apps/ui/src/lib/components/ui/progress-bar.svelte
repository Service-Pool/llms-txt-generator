<script lang="ts">
	import { Progressbar } from 'flowbite-svelte';
	import { type ProgressbarProps } from 'flowbite-svelte';

	interface Props {
		current: number;
		total: number;
		showNumbers?: boolean;
		showPercentage?: boolean;
		size?: ProgressbarProps['size'];
		label?: string;
	}

	let { current = 0, total = 100, showNumbers = true, showPercentage = true, size = 'h-2.5', label }: Props = $props();

	const percentage = $derived(total > 0 ? Math.round((current / total) * 100) : 0);
</script>

<div class="w-full">
	{#if label || showNumbers || showPercentage}
		<div class="flex justify-between mb-1 text-sm opacity-75 font-normal">
			{#if label || showNumbers}
				<span>
					{#if label}{label}{/if}
					{#if showNumbers}
						{#if label}{/if}{current}/{total}
					{/if}
				</span>
			{:else}
				<span></span>
			{/if}
			{#if showPercentage}
				<span>{percentage}%</span>
			{/if}
		</div>
	{/if}

	<Progressbar
		tweenDuration={400}
		animate={true}
		labelInside={false}
		progress={percentage.toString()}
		{size}
		color="primary"
	/>
</div>
