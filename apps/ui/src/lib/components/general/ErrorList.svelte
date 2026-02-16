<script lang="ts">
	import { List, Li, P } from 'flowbite-svelte';

	interface Props {
		error: string | string[] | null;
		label?: string | null;
		class?: string;
	}

	let { error, label: labelName = 'Errors:', class: className = 'text-red-600 dark:text-red-400' }: Props = $props();

	const errors = $derived.by(() => {
		if (!error) return [];
		return Array.isArray(error) ? error : [error];
	});
</script>

<P space="tight" size="xs" height="8">{labelName} ({errors.length})</P>

<List tag="ul" class="text-left space-y-1">
	{#each errors as errMsg}
		<Li class={className}>{errMsg}</Li>
	{/each}
</List>
