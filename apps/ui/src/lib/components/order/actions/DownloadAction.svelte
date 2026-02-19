<script lang="ts">
	import { Button, SpeedDialButton } from 'flowbite-svelte';
	import { getActionConfig } from '$lib/components/order-actions.config';
	import { ordersService } from '$lib/services/orders.service';
	import type { OrderResponseDto } from '@api/shared';

	const config = getActionConfig('download')!;

	interface Props {
		class?: string;
		order: OrderResponseDto;
		mode?: 'spd-button' | 'stepper';
		loading?: boolean;
		disabled?: boolean;
	}

	let { class: className = '', order, mode = 'stepper', loading = false, disabled = false }: Props = $props();

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

{#if mode === 'stepper'}
	<!-- Small button mode for stepper -->
	<Button
		size="lg"
		color={config.color}
		onclick={handleDownload}
		disabled={disabled || loading || isDownloading}
		loading={isDownloading}
		class="whitespace-nowrap {className}"
	>
		{config.label}
	</Button>
{:else if mode === 'spd-button'}
	<!-- Button mode for SpeedDial -->
	<SpeedDialButton name={config.label} color={config.color} class={className} pill onclick={handleDownload}>
		<config.icon size="md" />
	</SpeedDialButton>
{/if}
