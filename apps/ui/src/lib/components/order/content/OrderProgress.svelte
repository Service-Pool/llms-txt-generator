<script lang="ts">
	import type { OrderProgress } from '@api/shared';
	import ProgressBar from '$lib/components/ui/progress-bar.svelte';

	interface Props {
		progress: OrderProgress;
		totalUrls: number | null;
	}

	let { progress, totalUrls }: Props = $props();
</script>

{#if progress.step === 'Crawling'}
	<ProgressBar
		label="Crawling URLs"
		current={progress.processedUrls ?? 0}
		total={totalUrls ?? 0}
		size="h-1.5"
		showNumbers={true}
	/>
{:else if progress.step === 'Vectorizing'}
	<ProgressBar label="Vectorizing" current={1} total={1} size="h-1.5" showNumbers={false} />
{:else if progress.step === 'Clustering'}
	<ProgressBar label="Clustering" current={1} total={1} size="h-1.5" showNumbers={false} />
{:else if progress.step === 'Generating'}
	<div class="text-xs opacity-75 mb-1">
		Cluster {progress.clusterCurrent ?? 0}/{progress.clusterTotal ?? 0}
	</div>
	<ProgressBar
		current={progress.pageCurrent ?? 0}
		total={progress.pageTotal ?? 0}
		size="h-1.5"
		showNumbers={true}
		showPercentage={false}
	/>
{:else if progress.step === 'Assembling'}
	<ProgressBar label="Assembling" current={1} total={1} size="h-1.5" showNumbers={false} />
{/if}
