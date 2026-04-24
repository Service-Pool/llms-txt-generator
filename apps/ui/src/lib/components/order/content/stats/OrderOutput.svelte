<script lang="ts">
	import { type OrderResponseDto, HateoasAction, GenerationStrategy } from '@api/shared';
	import { Button, Tooltip, Badge, Hr, Indicator } from 'flowbite-svelte';
	import {
		FileCopyOutline,
		DownloadOutline,
		FileCopySolid,
		AngleDownOutline,
		RedoOutline
	} from 'flowbite-svelte-icons';
	import { ordersService } from '$lib/services/orders.service';

	interface Props {
		order: OrderResponseDto;
		class?: string;
	}

	let { order, class: className = '' }: Props = $props();

	let downloadData = $state<{ content: string; filename: string } | null>(null);
	let isLoadingOutput = $state(false);
	let isCopying = $state(false);
	let isDownloading = $state(false);
	let copySuccess = $state(false);
	let wrapText = $state(false);

	const hasDownloadAction = $derived(ordersService.hasAction(order, HateoasAction.DOWNLOAD));

	interface Block {
		title: string;
		content: string;
	}

	interface Section {
		heading: string;
		description: string;
		blocks: Block[];
	}

	interface ParsedOutput {
		siteName: string;
		siteDescription: string;
		sections: Section[];
	}

	function parseOutput(raw: string, clustered = true): ParsedOutput {
		// Strip incomplete open tag at end
		const lastOpen = raw.lastIndexOf('<!-- md -->');
		const lastClose = raw.lastIndexOf('<!-- /md -->');
		const cleaned = lastOpen !== -1 && lastOpen > lastClose ? raw.slice(0, lastOpen).trimEnd() : raw;

		const lines = cleaned.split('\n');
		let i = 0;

		const siteName = lines[i]?.replace(/^# /, '').trim() ?? '';
		i++;

		let siteDescription = '';
		while (i < lines.length && !lines[i].startsWith('## ')) {
			if (lines[i].trim()) siteDescription += (siteDescription ? '\n' : '') + lines[i];
			i++;
		}

		const sections: Section[] = [];

		while (i < lines.length) {
			if (lines[i].startsWith('## ')) {
				const heading = lines[i].replace(/^## /, '').trim();
				i++;
				let description = '';
				while (i < lines.length && !lines[i].startsWith('- [') && !lines[i].startsWith('## ')) {
					if (lines[i].trim()) description += (description ? '\n' : '') + lines[i];
					i++;
				}
				const blocks: Block[] = [];
				while (i < lines.length && !lines[i].startsWith('## ')) {
					if (lines[i].startsWith('- [')) {
						const title = lines[i];
						i++;
						let content = '';
						if (clustered) {
							while (i < lines.length && lines[i] !== '<!-- md -->') i++;
							i++; // skip <!-- md -->
							while (i < lines.length && lines[i] !== '<!-- /md -->') {
								content += (content ? '\n' : '') + lines[i];
								i++;
							}
							i++; // skip <!-- /md -->
						}
						blocks.push({ title, content: content.trim() });
					} else {
						i++;
					}
				}
				sections.push({ heading, description, blocks });
			} else {
				i++;
			}
		}

		return { siteName, siteDescription, sections };
	}

	function prepareExportContent(raw: string): string {
		const lastOpen = raw.lastIndexOf('<!-- md -->');
		const lastClose = raw.lastIndexOf('<!-- /md -->');
		let cleaned = lastOpen !== -1 && lastOpen > lastClose ? raw.slice(0, lastOpen).trimEnd() : raw;
		cleaned = cleaned.replace(/^<!-- md -->\n?/gm, '');
		cleaned = cleaned.replace(/^<!-- \/md -->\n?/gm, '');
		return cleaned;
	}

	const isClustered = $derived(order.attributes.strategy === GenerationStrategy.CLUSTERED);
	const isTruncated = $derived(downloadData === null && (order.attributes.output ?? '').includes('<!-- truncated -->'));
	const parsed = $derived(parseOutput(downloadData?.content ?? order.attributes.output ?? '', isClustered));

	const lineCount = $derived(
		1 + // siteName
			parsed.siteDescription.split('\n').length +
			1 +
			parsed.sections.reduce(
				(acc, s) =>
					acc +
					1 +
					s.description.split('\n').length +
					1 +
					s.blocks.reduce((a, b) => a + 1 + b.content.split('\n').length, 0),
				0
			)
	);
	const lnWidth = $derived(`${(lineCount.toString().length * 0.6 + 2).toFixed(1)}rem`);

	const loadFullOutput = async () => {
		if (downloadData !== null || isLoadingOutput) return;
		isLoadingOutput = true;
		try {
			const response = await ordersService.download(order.attributes.id);
			downloadData = response.getData().attributes;
		} finally {
			isLoadingOutput = false;
		}
	};

	const handleCopyClick = async () => {
		if (!order.attributes.output) return;
		isCopying = true;
		try {
			await loadFullOutput();
			const content = downloadData?.content ?? order.attributes.output ?? '';
			await navigator.clipboard.writeText(prepareExportContent(content));
			copySuccess = true;
			setTimeout(() => (copySuccess = false), 2000);
		} finally {
			isCopying = false;
		}
	};

	const handleDownloadClick = async () => {
		if (!order.attributes.output) return;
		isDownloading = true;
		try {
			await loadFullOutput();
			const content = downloadData?.content;
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
		} finally {
			isDownloading = false;
		}
	};
</script>

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
				<Button
					size="sm"
					color="light"
					class="p-5 w-8 h-8 rounded-full border-none {wrapText ? 'bg-gray-200 dark:bg-gray-600' : 'bg-inherit'}"
					title={wrapText ? 'Disable text wrapping' : 'Enable text wrapping'}
					onclick={() => (wrapText = !wrapText)}
				>
					<RedoOutline size="md" class="w-4 h-4 rotate-180 text-gray-800 dark:text-white" />
				</Button>
				<Tooltip>{wrapText ? 'Disable text wrapping' : 'Enable text wrapping'}</Tooltip>
			</div>
		</div>

		<Hr class="my-0" />

		<div class="viewer-wrap">
			<div
				class="output-viewer font-mono text-xs overflow-auto max-h-120 pt-2 {wrapText ? '' : 'whitespace-nowrap'}"
				style="--ln-width: {lnWidth}"
			>
				<div class="line">
					<span class="ln"></span>
					<span class="text font-bold"># {parsed.siteName}</span>
				</div>
				{#each parsed.siteDescription ? parsed.siteDescription.split('\n') : [] as ln}
					<div class="line">
						<span class="ln"></span>
						<span class="muted">{ln}</span>
					</div>
				{/each}

				{#each parsed.sections as section}
					<div class="line">
						<span class="ln"></span>
						<span></span>
					</div>
					<div class="line">
						<span class="ln"></span>
						<span class="text font-semibold">## {section.heading}</span>
					</div>
					{#each section.description ? section.description.split('\n') : [] as ln}
						<div class="line">
							<span class="ln"></span>
							<span class="muted">{ln}</span>
						</div>
					{/each}
					{#each section.blocks as block}
						{#if block.content}
							<details class="block md-block">
								<summary class="line cursor-pointer list-none">
									<span class="ln fold-ln"></span>
									<span class="text">{block.title}</span>
								</summary>
								<div class="md-content">
									{#each block.content.split('\n') as ln}
										<div class="line">
											<span class="ln"></span>
											<span class="content muted">{ln}</span>
										</div>
									{/each}
								</div>
							</details>
						{:else}
							<div class="line">
								<span class="ln"></span>
								<span class="text">{block.title}</span>
							</div>
						{/if}
					{/each}
				{/each}
			</div>
		</div>

		{#if isTruncated}
			<button class="load-more" onclick={loadFullOutput} disabled={isLoadingOutput}>
				<AngleDownOutline size="sm" />
				Load full content
			</button>
		{/if}
	</div>
{/if}

<style>
	/* ── Tokens ─────────────────────────────────────────── */
	.output-viewer {
		--c-muted: var(--color-gray-600);
		--c-ln: var(--color-gray-400);
		--c-gutter-bg: var(--color-gray-50);
		--c-gutter-br: var(--color-gray-200);
		--c-block-bg: var(--color-gray-50);
		--c-block-br: var(--color-gray-200);
		--c-chevron: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ccc' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='9 18 15 12 9 6'/%3E%3C/svg%3E");
		--c-chevron-open: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ccc' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
		counter-reset: ln;
	}
	:global(.dark) .output-viewer {
		--c-muted: var(--color-gray-400);
		--c-ln: var(--color-gray-500);
		--c-gutter-bg: var(--color-gray-800);
		--c-gutter-br: var(--color-gray-700);
		--c-block-bg: var(--color-gray-900);
		--c-block-br: var(--color-gray-600);
	}

	/* ── Text colours ────────────────────────────────────── */
	.output-viewer .text,
	.output-viewer .muted {
		color: var(--c-muted);
	}

	/* ── Line layout ─────────────────────────────────────── */
	.line {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		min-height: 1.4em;
		overflow-wrap: break-word;
	}

	/* ── Gutter ──────────────────────────────────────────── */
	.ln {
		counter-increment: ln;
		width: var(--ln-width, 3.5rem);
		min-width: var(--ln-width, 3.5rem);
		display: inline-grid;
		grid-template-columns: 1fr 0.875rem;
		gap: 0 4px;
		align-items: start;
		align-self: stretch;
		flex-shrink: 0;
		user-select: none;
		color: var(--c-ln);
		background: var(--c-gutter-bg);
		border-right: 1px solid var(--c-gutter-br);
		padding: 0 6px 0 0;
		margin-right: 4px;
	}
	.ln::before {
		content: counter(ln);
		text-align: right;
	}
	.ln::after {
		content: '';
	}
	.fold-ln::before {
		content: counter(ln);
		text-align: right;
	}
	.fold-ln::after {
		content: '';
		display: inline-block;
		width: 1rem;
		height: 1rem;
		background: var(--c-chevron) no-repeat center / contain;
		vertical-align: middle;
	}
	details[open] summary .fold-ln::after {
		background-image: var(--c-chevron-open);
	}

	/* ── Expandable md block ─────────────────────────────── */
	.md-block .content {
		padding-left: 1rem;
	}

	details[open].md-block > summary {
		border-top: 1px solid var(--c-block-br);
		background: var(--c-block-bg);
	}
	details[open].md-block + details[open].md-block > summary {
		border-top: none;
	}
	.md-content {
		border-bottom: 1px solid var(--c-block-br);
		background: var(--c-block-bg);
	}

	/* ── Load-more button ────────────────────────────────── */
	.load-more {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		width: 100%;
		padding: 0.5rem 0;
		margin-top: 0.25rem;
		font-size: 0.7rem;
		color: var(--color-gray-400);
		background: none;
		border: none;
		cursor: pointer;
		transition: color 0.15s;
	}
	.load-more:hover {
		color: var(--color-gray-600);
	}
	:global(.dark) .load-more:hover {
		color: var(--color-gray-200);
	}
</style>
