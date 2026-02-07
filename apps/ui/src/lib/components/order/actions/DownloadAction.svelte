<script lang="ts">
	import { Button } from 'flowbite-svelte';
	import { DownloadSolid } from 'flowbite-svelte-icons';
	import { ordersService } from '$lib/services/orders.service';
	import type { OrderResponseDto } from '@api/shared';

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
		} catch (error) {
			console.error('Download failed:', error);
		}
	};
</script>

<div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
	<div class="flex items-center justify-between">
		<div>
			<div class="font-semibold text-gray-900 dark:text-white">
				<DownloadSolid class="w-4 h-4 inline me-2 text-blue-600 dark:text-blue-400" />
				File Ready
			</div>
			<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Your LLMs.txt file is ready to download</p>
		</div>
		<Button color="blue" onclick={handleDownload}>Download Result</Button>
	</div>
</div>
