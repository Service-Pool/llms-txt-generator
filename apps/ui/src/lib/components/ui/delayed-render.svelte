<script lang="ts">
	import { type Snippet, onMount } from 'svelte';

	interface Props {
		children: Snippet;
		delay?: number;
	}

	const { children, delay = 300 }: Props = $props();

	let showContent = $state(false);

	onMount(() => {
		if (delay > 0) {
			const timeoutId = setTimeout(() => {
				showContent = true;
			}, delay);
			return () => clearTimeout(timeoutId);
		} else {
			showContent = true;
			return; // Explicitly return nothing
		}
	});
</script>

{#if showContent}
	{@render children()}
{/if}
