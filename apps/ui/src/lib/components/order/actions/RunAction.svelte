<script lang="ts">
	import { Button } from 'flowbite-svelte';
	import { getActionConfig } from '$lib/config/order-actions.config';
	import type { OrderResponseDto } from '@api/shared';

	const config = getActionConfig('run')!;

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
			onUpdate?.();
		} catch (exception) {
			throw exception;
		} finally {
			isRunning = false;
		}
	};
</script>

<div class="p-4 rounded-lg border {config.cardBgClass}">
	<div class="flex items-center justify-between">
		<div>
			<div class="font-semibold text-gray-900 dark:text-white">
				<config.icon class="w-4 h-4 inline me-2 {config.iconColorClass}" />
				{config.description}
			</div>
			<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Start generating LLMs.txt file</p>
		</div>
		<Button onclick={handleRun} color={config.color} size="sm" class="min-w-25 whitespace-nowrap" disabled={isRunning}>
			{isRunning ? 'Starting...' : config.label}
		</Button>
	</div>
</div>
