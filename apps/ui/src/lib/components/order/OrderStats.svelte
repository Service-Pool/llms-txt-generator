<script lang="ts">
	import { type OrderResponseDto, HateoasAction } from '@api/shared';
	import { Button, Tooltip, Badge, Hr, Alert, List, Li, P } from 'flowbite-svelte';
	import { FileCopyOutline, DownloadSolid, FileCopySolid } from 'flowbite-svelte-icons';
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

<!-- Info -->
<div class="space-y-4">
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
						? new Date(order.attributes.completedAt).toLocaleString(undefined, {
								dateStyle: 'short',
								timeStyle: 'short'
							})
						: '—'}
				</span>
			</div>
		</div>
	</div>

	<!-- Output -->
	{#if hasDownloadAction}
		<div class={className}>
			<div class="flex items-center justify-between mb-2">
				<span class="stat-label">Generated <Badge>llms.txt</Badge><sup class="text-red-500">&nbsp;●</sup></span>
				<div class="flex gap-1">
					<Button size="sm" color="light" class="p-2!" onclick={handleCopyClick} loading={isCopying}>
						{#if copySuccess}
							<FileCopyOutline size="md" />
						{:else}
							<FileCopySolid size="md" />
						{/if}
					</Button>
					<Tooltip>Copy content</Tooltip>
					<Button size="sm" color="light" class="p-2!" onclick={handleDownloadClick} loading={isDownloading}>
						{#if downloadSuccess}
							<DownloadSolid size="md" />
						{:else}
							<DownloadSolid size="md" />
						{/if}
					</Button>
					<Tooltip>Download content</Tooltip>
				</div>
			</div>

			<Hr class="my-0" />
			<pre
				bind:this={outputElement}
				class="text-xs pt-2 pl-2 dark:text-white overflow-auto whitespace-pre-wrap wrap-break-word max-h-120 leading-normal">{displayedOutput}</pre>
		</div>
	{/if}

	<!-- Errors -->
	{#if order.attributes.errors && order.attributes.errors.length > 0}
		<div>
			<Alert color="red" class="text-xs">
				<P class="text-red-600 dark:text-red-400" space="tight" size="xs" height="8"
					>Errors: ({order.attributes.errors.length})</P
				>

				<List tag="ul" class="text-left space-y-1">
					{#each order.attributes.errors as errMsg}
						<Li class="text-red-600 dark:text-red-400">{errMsg}</Li>
					{/each}
				</List>
			</Alert>
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
