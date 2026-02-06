<script lang="ts">
	import { Spinner as FlowbiteSpinner } from 'flowbite-svelte';
	import { type SpinnerProps } from 'flowbite-svelte';

	interface Props {
		size?: SpinnerProps['size'];
		color?: SpinnerProps['color'];
		delay?: number;
	}

	let { size = '6', color = 'primary', delay = 0 }: Props = $props();

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
</script>

{#if isVisible}
	<FlowbiteSpinner {size} type="orbit" {color} />
{/if}
