<script lang="ts">
	import { Badge } from 'flowbite-svelte';
	import { statsStore } from '$lib/stores/stats.store.svelte';

	let count = $state<number | null>();

	// Subscribe to completedCount store
	$effect(() => {
		const unsubscribe = statsStore.completedCount.subscribe((value) => {
			count = value;
		});

		return () => unsubscribe();
	});
</script>

<span class="text-sm whitespace-nowrap text-gray-600 dark:text-gray-400">
	ATM generated <Badge color="indigo">{count?.toLocaleString() ?? '—'} llms.txt</Badge> files
</span>
