<script lang="ts">
	import { Button } from 'flowbite-svelte';
	import { getActionConfig } from '$lib/config/order-actions.config';
	import { ordersService } from '$lib/services/orders.service';
	import type { OrderResponseDto } from '@api/shared';

	const config = getActionConfig('download')!;

	interface Props {
		order: OrderResponseDto;
		mode?: 'card' | 'button';
		loading?: boolean;
	}

	let { order, mode = 'card', loading = false }: Props = $props();

	let isDownloading = $state(false);

	const handleDownload = async (e: MouseEvent) => {
		e.stopPropagation();
		isDownloading = true;
		try {
			const response = await ordersService.download(order.attributes.id);
			const data = response.getData().attributes;
			const blob = new Blob([data.content], { type: 'text/plain' });
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = data.filename;
			a.style.display = 'none';
			a.addEventListener('click', (e) => e.stopPropagation());
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (exception) {
			throw exception;
		} finally {
			isDownloading = false;
		}
	};
</script>

{#if mode === 'button'}
	<!-- Button mode for SpeedDial -->
	<Button
		size="xs"
		color={config.color}
		pill
		class="justify-start shadow-md whitespace-nowrap"
		onclick={handleDownload}
		loading={loading || isDownloading}
	>
		<config.icon class="w-5 h-5 me-2" />
		{config.label}
	</Button>
{:else}
	<!-- Card mode for accordion -->
	<div class="p-4 rounded-lg border {config.cardBgClass}">
		<div class="flex items-center justify-between">
			<div>
				<div class="font-semibold text-gray-900 dark:text-white">
					<config.icon class="w-4 h-4 inline me-2 {config.iconColorClass}" />
					{config.description}
				</div>
				<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Your LLMs.txt file is ready to download</p>
			</div>
			<Button
				onclick={handleDownload}
				color={config.color}
				size="sm"
				class="min-w-25 whitespace-nowrap"
				loading={loading || isDownloading}>{config.label}</Button
			>
		</div>
	</div>
{/if}
