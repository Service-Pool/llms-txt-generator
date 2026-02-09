<script lang="ts">
	import { type OrderResponseDto } from '@api/shared';
	import { Button, Hr, Clipboard } from 'flowbite-svelte';
	import { CheckOutline, ClipboardSolid, DownloadSolid } from 'flowbite-svelte-icons';
	import { ordersService } from '$lib/services/orders.service';
	import './OrderStats.css';

	interface Props {
		order: OrderResponseDto;
		class?: string;
	}

	let { order, class: className = '' }: Props = $props();

	let outputElement = $state<HTMLPreElement | null>(null);
	let downloadData = $state<{ content: string; filename: string } | null>(null);
	let displayedOutput = $derived(downloadData?.content ?? order.output ?? '');
	let isLoadingOutput = $state(false);
	let copySuccess = $state(false);

	const loadFullOutput = async () => {
		if (downloadData !== null || isLoadingOutput) {
			return;
		}

		isLoadingOutput = true;
		try {
			const response = await ordersService.download(order.id);
			downloadData = response.getData();
		} catch (exception) {
			throw exception;
		} finally {
			isLoadingOutput = false;
		}
	};

	const handleCopyClick = async () => {
		if (!order.output) {
			return;
		}

		try {
			await loadFullOutput();
		} catch (exception) {
			throw exception;
		}
	};

	const handleDownload = async () => {
		if (!order.output) {
			return;
		}

		try {
			await loadFullOutput();
			const content = outputElement?.textContent;
			if (content && downloadData?.filename) {
				const blob = new Blob([content], { type: 'text/plain' });
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = downloadData.filename;
				document.body.appendChild(a);
				a.click();
				window.URL.revokeObjectURL(url);
				document.body.removeChild(a);
			}
		} catch (exception) {
			throw exception;
		}
	};
</script>

<div class={className}>
	<div
		class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-[minmax(60px,auto)_minmax(100px,1fr)_minmax(90px,auto)_repeat(4,minmax(120px,1fr))] gap-2 text-xs"
	>
		<div class="flex flex-col">
			<span class="stat-label">Order</span>
			<span class="stat-value">
				#{order.id}
			</span>
		</div>
		<div class="flex flex-col">
			<span class="stat-label">AI Model</span>
			<span class="stat-value">
				{order.currentAiModel?.displayName ?? '—'}
			</span>
		</div>
		<div class="flex flex-col">
			<span class="stat-label">Total Price</span>
			<span class="stat-value">
				{#if order.priceTotal !== null}
					{order.currencySymbol}{order.priceTotal.toFixed(2)}
				{:else}
					—
				{/if}
			</span>
		</div>
		<div class="flex flex-col">
			<span class="stat-label">Created</span>
			<span class="stat-value">
				{order.createdAt
					? new Date(order.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
					: '—'}
			</span>
		</div>
		<div class="flex flex-col">
			<span class="stat-label">Updated</span>
			<span class="stat-value">
				{order.updatedAt
					? new Date(order.updatedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
					: '—'}
			</span>
		</div>
		<div class="flex flex-col">
			<span class="stat-label">Started</span>
			<span class="stat-value">
				{order.startedAt
					? new Date(order.startedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
					: '—'}
			</span>
		</div>
		<div class="flex flex-col">
			<span class="stat-label">Completed</span>
			<span class="stat-value">
				{order.completedAt
					? new Date(order.completedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
					: '—'}
			</span>
		</div>
	</div>

	{#if order.output}
		<div class="mt-4">
			<div class="flex items-center justify-between mb-2">
				<span class="stat-label">Output</span>
				<div class="flex gap-1">
					<Clipboard
						bind:value={displayedOutput}
						bind:success={copySuccess}
						class="p-1.5!"
						color="light"
						size="xs"
						onclick={handleCopyClick}
					>
						{#if copySuccess}
							<CheckOutline class="w-4 h-4" />
						{:else}
							<ClipboardSolid class="w-4 h-4" />
						{/if}
					</Clipboard>
					<Button size="xs" color="light" class="p-1.5!" onclick={handleDownload}>
						<DownloadSolid class="w-4 h-4" />
					</Button>
				</div>
			</div>
			<Hr class="my-0.5" />
			<pre
				bind:this={outputElement}
				class="text-xs pt-2 overflow-auto whitespace-pre-wrap wrap-break-word max-h-120 leading-normal dark:text-white">{displayedOutput}</pre>
			<Hr class="my-0.5" />
		</div>
	{/if}
</div>
