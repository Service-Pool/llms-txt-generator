<script lang="ts">
	import { type OrderResponseDto, HateoasAction } from '@api/shared';
	import { Button, Tooltip, Badge, Hr, Indicator } from 'flowbite-svelte';
	import { FileCopyOutline, DownloadOutline, FileCopySolid } from 'flowbite-svelte-icons';
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
			}
		} catch (exception) {
			throw exception;
		} finally {
			isDownloading = false;
		}
	};
</script>

<!--
  OrderOutput

  Content component — отображение сгенерированного llms.txt с кнопками копирования и скачивания.
  Загружает полный контент лениво (по клику). Рендерится только при наличии HATEOAS DOWNLOAD action.
-->
{#if hasDownloadAction}
	<div class={className}>
		<div class="flex items-center justify-between mb-2">
			<span class="flex items-center gap-1">
				<span>Generated</span>
				<Badge>llms.txt</Badge>
				<Indicator size="xs" color="green" />
			</span>
			<div class="flex gap-1">
				<Button
					color="light"
					class="p-5 w-8 h-8 rounded-full border-none bg-inherit"
					onclick={handleCopyClick}
					disabled={isCopying}
				>
					{#if copySuccess}
						<FileCopySolid size="md" class="text-gray-800 dark:text-white" />
					{:else}
						<FileCopyOutline size="md" class="text-gray-800 dark:text-white" />
					{/if}
				</Button>
				<Tooltip>Copy content</Tooltip>
				<Button
					size="sm"
					color="light"
					class="p-5 w-8 h-8 rounded-full border-none bg-inherit"
					onclick={handleDownloadClick}
					disabled={isDownloading}
				>
					<DownloadOutline size="md" class="text-gray-800 dark:text-white" />
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
