<script lang="ts">
	import { onMount } from "svelte";

	interface Props {
		size?: "sm" | "md" | "lg";
		color?: string;
		delay?: number;
	}

	let { size = "md", color = "#3b82f6", delay = 0 }: Props = $props();

	let isVisible = $state(false);

	$effect(() => {
		if (delay === 0) {
			isVisible = true;
		} else if (delay > 0) {
			const timeout = setTimeout(() => {
				isVisible = true;
			}, delay);

			return () => clearTimeout(timeout);
		}

		return;
	});

	onMount(() => {
		// onMount cleanup handled by $effect
	});

	const sizeMap = {
		sm: "h-5 w-5",
		md: "h-8 w-8",
		lg: "h-12 w-12",
	};

	const sizeClass = $derived(sizeMap[size]);
</script>

{#if isVisible}
	<div
		class="animate-spin rounded-full border-2 {sizeClass}"
		style="border-color: {color}; border-top-color: transparent;">
	</div>
{/if}

<style>
	:global(.animate-spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
