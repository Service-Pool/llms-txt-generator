<script lang="ts">
	import { List, Li, P } from "flowbite-svelte";

	interface Props {
		error: string | string[] | null;
		class?: string;
	}

	let { error, class: className = "text-red-600 dark:text-red-400" }: Props =
		$props();

	const errors = $derived.by(() => {
		if (!error) return [];
		return Array.isArray(error) ? error : [error];
	});
</script>

{#if errors.length === 1}
	<P class={className}>{errors[0]}</P>
{:else if errors.length > 1}
	<List tag="ul" class="text-left space-y-1">
		{#each errors as errMsg}
			<Li class={className}>{errMsg}</Li>
		{/each}
	</List>
{/if}
