<script lang="ts">
	import { type OrderResponseDto, HateoasAction } from '@api/shared';
	import { Button, Tooltip, Hr } from 'flowbite-svelte';
	import { CheckOutline, DownloadSolid, ClipboardSolid } from 'flowbite-svelte-icons';
	import { ordersService } from '$lib/services/orders.service';

	interface Props {
		order: OrderResponseDto;
		class?: string;
	}

	let { order, class: className = '' }: Props = $props();

	let outputElement = $state<HTMLPreElement | null>(null);
	let downloadData = $state<{ content: string; filename: string } | null>(null);
	let displayedOutput = $derived(downloadData?.content ?? order.attributes.output ?? '');
	let isLoadingOutput = $state(false);
	let isCopying = $state(false);
	let isDownloading = $state(false);
	let copySuccess = $state(false);
	let downloadSuccess = $state(false);

	// Check if download action is available in HATEOAS links (backend permission)
	const hasDownloadAction = $derived(ordersService.hasAction(order, HateoasAction.DOWNLOAD));

	const loadFullOutput = async () => {
		if (downloadData !== null || isLoadingOutput) {
			return;
		}

		isLoadingOutput = true;
		try {
			const response = await ordersService.download(order.attributes.id);
			downloadData = response.getData().attributes;
		} catch (exception) {
			throw exception;
		} finally {
			isLoadingOutput = false;
		}
	};

	const handleCopyClick = async () => {
		if (!order.attributes.output) {
			return;
		}

		isCopying = true;
		try {
			await loadFullOutput();
			const content = downloadData?.content ?? displayedOutput;
			await navigator.clipboard.writeText(content);
			copySuccess = true;
			setTimeout(() => (copySuccess = false), 2000);
		} catch (exception) {
			throw exception;
		} finally {
			isCopying = false;
		}
	};

	const handleDownloadClick = async () => {
		if (!order.attributes.output) {
			return;
		}

		isDownloading = true;
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
				downloadSuccess = true;
				setTimeout(() => (downloadSuccess = false), 2000);
			}
		} catch (exception) {
			throw exception;
		} finally {
			isDownloading = false;
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
				#{order.attributes.id}
			</span>
		</div>
		<div class="flex flex-col">
			<span class="stat-label">AI Model</span>
			<span class="stat-value">
				{order.attributes.currentAiModel?.displayName ?? '—'}
			</span>
		</div>
		<div class="flex flex-col">
			<span class="stat-label">Total Price</span>
			<span class="stat-value">
				{#if order.attributes.priceTotal !== null}
					{order.attributes.currencySymbol}{order.attributes.priceTotal.toFixed(2)}
				{:else}
					—
				{/if}
			</span>
		</div>
		<div class="flex flex-col">
			<span class="stat-label">Created</span>
			<span class="stat-value">
				{order.attributes.createdAt
					? new Date(order.attributes.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
					: '—'}
			</span>
		</div>
		<div class="flex flex-col">
			<span class="stat-label">Updated</span>
			<span class="stat-value">
				{order.attributes.updatedAt
					? new Date(order.attributes.updatedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
					: '—'}
			</span>
		</div>
		<div class="flex flex-col">
			<span class="stat-label">Started</span>
			<span class="stat-value">
				{order.attributes.startedAt
					? new Date(order.attributes.startedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
					: '—'}
			</span>
		</div>
		<div class="flex flex-col">
			<span class="stat-label">Completed</span>
			<span class="stat-value">
				{order.attributes.completedAt
					? new Date(order.attributes.completedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
					: '—'}
			</span>
		</div>
	</div>

	{#if hasDownloadAction}
		<div class="mt-4">
			<div class="flex items-center justify-between mb-2">
				<span class="stat-label">Output</span>
				<div class="flex gap-1">
					<Button size="sm" color="light" class="rounded-full p-2!" onclick={handleCopyClick} loading={isCopying}>
						{#if copySuccess}
							<CheckOutline class="w-5 h-5" />
						{:else}
							<ClipboardSolid class="w-5 h-5" />
						{/if}
					</Button>
					<Tooltip>Copy content</Tooltip>
					<Button
						size="sm"
						color="light"
						class="rounded-full p-2!"
						onclick={handleDownloadClick}
						loading={isDownloading}
					>
						{#if downloadSuccess}
							<CheckOutline class="w-5 h-5" />
						{:else}
							<DownloadSolid class="w-5 h-5" />
						{/if}
					</Button>
					<Tooltip>Download content</Tooltip>
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

<style>
	@reference "tailwindcss";

	.stat-label {
		@apply mt-1 text-gray-500;
	}

	.stat-value {
		@apply mt-1 font-medium text-gray-900;
	}

	:global(.dark) .stat-label {
		@apply text-gray-400;
	}

	:global(.dark) .stat-value {
		@apply font-medium text-white;
	}
</style>
