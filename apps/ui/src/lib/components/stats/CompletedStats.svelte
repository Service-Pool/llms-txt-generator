<script lang="ts">
	import { statsStore } from '$lib/stores/stats.store.svelte';

	let count = $state(0);

	// Subscribe to completedCount store
	$effect(() => {
		const unsubscribe = statsStore.completedCount.subscribe((value) => {
			count = value;
		});

		return () => unsubscribe();
	});
</script>

<div
	class="flex items-center justify-center gap-3 p-4 bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800"
>
	<div class="text-center">
		<div class="text-xl font-bold text-green-600 dark:text-green-400">
			At the moment we've generated {count.toLocaleString()} llms.txt files
		</div>
	</div>
</div>
