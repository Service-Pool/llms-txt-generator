<script lang="ts">
	import type { OrderProgress } from '@api/shared';
	import ProgressBar from '$lib/components/ui/progress-bar.svelte';

	interface Props {
		progress: OrderProgress;
		totalUrls: number | null;
	}

	let { progress, totalUrls }: Props = $props();

	const BRAILLE_FRAMES = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'];
	let frame = $state(0);
	$effect(() => {
		const id = setInterval(() => {
			frame = (frame + 1) % BRAILLE_FRAMES.length;
		}, 80);
		return () => clearInterval(id);
	});
</script>

{#if progress.attempt > 1}
	<div class="text-xs opacity-60 mb-1">Attempt {progress.attempt}</div>
{/if}

{#if progress.step === 'Crawling'}
	<div class="text-xs opacity-75 mb-1">Crawling URLs {BRAILLE_FRAMES[frame]}</div>
	<ProgressBar current={progress.processedUrls ?? 0} total={totalUrls ?? 0} size="h-1.5" showNumbers={true} />
{:else if progress.step === 'Generating'}
	<div class="text-xs opacity-75 mb-1">
		Cluster {progress.clusterCurrent ?? 0}/{progress.clusterTotal ?? 0}, processing pages {BRAILLE_FRAMES[frame]}
	</div>
	<ProgressBar
		current={progress.pageCurrent ?? 0}
		total={progress.pageTotal ?? 0}
		size="h-1.5"
		showNumbers={true}
		showPercentage={false}
	/>
{:else}
	<div class="text-xs opacity-75">{progress.step} {BRAILLE_FRAMES[frame]}</div>
{/if}
