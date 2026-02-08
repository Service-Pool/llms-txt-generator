<script lang="ts">
	import { Button } from 'flowbite-svelte';
	import { getActionConfig } from '$lib/config/order-actions.config';
	import { ordersService } from '$lib/services/orders.service';
	import type { OrderResponseDto } from '@api/shared';

	const config = getActionConfig('download')!;

	interface Props {
		order: OrderResponseDto;
		onUpdate?: () => void;
	}

	let { order, onUpdate }: Props = $props();

	const handleDownload = async () => {
		try {
			const blob = await ordersService.download(order.id);
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			const domain = new URL(order.hostname).hostname;
			a.download = `llms-${domain}.txt`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (exception) {
			throw exception;
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
			<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Your LLMs.txt file is ready to download</p>
		</div>
		<Button onclick={handleDownload} color={config.color} size="sm" class="min-w-25 whitespace-nowrap"
			>{config.label}</Button
		>
	</div>
</div>
