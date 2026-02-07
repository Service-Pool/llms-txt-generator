<script lang="ts">
	import { Button } from 'flowbite-svelte';
	import { FireSolid } from 'flowbite-svelte-icons';
	import type { OrderResponseDto } from '@api/shared';

	interface Props {
		order: OrderResponseDto;
		onUpdate?: () => void;
	}

	let { order, onUpdate }: Props = $props();

	let isRunning = $state(false);

	const handleRun = async () => {
		isRunning = true;
		try {
			// TODO: Implement run API call
			console.log('Start processing');
			onUpdate?.();
		} catch (error) {
			console.error('Run failed:', error);
		} finally {
			isRunning = false;
		}
	};
</script>

<div class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
	<div class="flex items-center justify-between">
		<div>
			<div class="font-semibold text-gray-900 dark:text-white">
				<FireSolid class="w-4 h-4 inline me-2 text-red-600 dark:text-red-400" />
				Ready to Process
			</div>
			<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Start generating LLMs.txt file</p>
		</div>
		<Button color="red" disabled={isRunning} onclick={handleRun}>
			{isRunning ? 'Starting...' : 'Start Processing'}
		</Button>
	</div>
</div>
