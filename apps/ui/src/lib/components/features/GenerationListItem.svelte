<script lang="ts">
	import { GenerationStatus, type GenerationRequestDtoResponse } from '@api/shared';
	import ProgressBar from '../common/ProgressBar.svelte';
	import { GenerationsService } from '$lib/api/generations.service';
	import Spinner from '../common/Spinner.svelte';

	interface Props {
		item: GenerationRequestDtoResponse;
		progress?: { processedUrls: number; totalUrls: number } | null;
		onDelete: (id: number) => void;
	}

	let { item, progress = null, onDelete }: Props = $props();
	
	let showContent = $state(false);
	let fullContent = $state<string | null>(null);
	let isLoading = $state(false);
	
	const generationsService = new GenerationsService();

	const status = $derived.by(() => {
		return item.status || GenerationStatus.WAITING;
	});

	const statusConfig = $derived.by(() => {
		switch (status) {
			case GenerationStatus.WAITING:
				return { text: 'Waiting', class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' };
			case GenerationStatus.ACTIVE:
				return { text: 'Processing', class: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' };
			case GenerationStatus.COMPLETED:
				return { text: 'Completed', class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' };
			case GenerationStatus.FAILED:
				return { text: 'Failed', class: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' };
			default:
				return { text: 'Unknown', class: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' };
		}
	});

	const formattedDate = $derived(
		item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'
	);

	const handleDelete = (e: MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		if (confirm(`Delete generation for ${item.hostname}?`)) {
			onDelete(item.id);
		}
	};

	const handleShowContent = async () => {
		if (fullContent) {
			showContent = !showContent;
			return;
		}

		isLoading = true;
		try {
			const response = await generationsService.findById(item.generationId);
			fullContent = response.message.content;
			showContent = true;
		} catch (error) {
			alert('Failed to load content');
			console.error(error);
		} finally {
			isLoading = false;
		}
	};

	const handleCopy = async () => {
		if (!fullContent) return;
		try {
			await navigator.clipboard.writeText(fullContent);
			alert('Content copied to clipboard');
		} catch {
			alert('Failed to copy content');
		}
	};

	const handleDownload = () => {
		if (!fullContent) return;
		// Extract domain from hostname (e.g., "https://mototechna.cz" -> "mototechna.cz")
		const domain = new URL(item.hostname).hostname;
		const element = document.createElement('a');
		element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(fullContent));
		element.setAttribute('download', `llms-${domain}.txt`);
		element.style.display = 'none';
		document.body.appendChild(element);
		element.click();
		document.body.removeChild(element);
	};
</script>

<div class="p-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
	<div class="flex items-start justify-between gap-4 mb-3">
		<div class="flex-1 min-w-0">
			<!-- Hostname -->
			<h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate mb-2">
				{item.hostname || 'Unknown'}
			</h3>

			<!-- Status & Provider -->
			<div class="flex items-center gap-2 mb-3">
				<span class="px-2.5 py-0.5 rounded text-xs font-medium {statusConfig.class}">
					{statusConfig.text}
				</span>
				<span class="text-sm text-gray-500 dark:text-gray-400">
					{item.provider || 'unknown'}
				</span>
			</div>

			<!-- Progress Bar for Active Generations -->
			{#if status === GenerationStatus.ACTIVE && progress}
				<div class="mb-3">
					<ProgressBar
						current={progress.processedUrls}
						total={progress.totalUrls}
						size="sm"
						showPercentage={true}
						showNumbers={true}
					/>
				</div>
			{/if}

			<!-- Error Message -->
			{#if status === GenerationStatus.FAILED && item.errorMessage}
				<div class="text-sm text-red-600 dark:text-red-400 mb-2">
					Error: {item.errorMessage}
				</div>
			{/if}

			<!-- Metadata -->
			<div class="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
				<span>{formattedDate}</span>
				{#if item.entriesCount}
					<span>{item.entriesCount} entries</span>
				{/if}
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="shrink-0 flex items-center gap-2">
			{#if status === GenerationStatus.COMPLETED}
				<button
					onclick={handleShowContent}
					disabled={false}
					class="px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<span>{showContent ? 'Hide' : 'Show'}</span>
				</button>
			{/if}

			<button
				onclick={handleDelete}
				class="px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-200 rounded transition-colors"
				aria-label="Delete generation"
			>
				Delete
			</button>
		</div>
	</div>

	<!-- Content Section -->
	{#if showContent || isLoading}
		<div class="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 mb-3 max-h-96 overflow-y-auto">
			{#if isLoading}
				<div class="flex justify-center items-center py-8">
					<Spinner size="md" color="#3b82f6" delay={1000} />
				</div>
			{:else}
				<p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-all">
					{fullContent}
				</p>
			{/if}
		</div>
	{/if}

	<!-- Action Buttons for Content -->
	{#if showContent && fullContent && !isLoading}
		<div class="flex gap-2 justify-end">
			<button
				onclick={handleCopy}
				class="px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-200 rounded transition-colors"
			>
				Copy
			</button>
			<button
				onclick={handleDownload}
				class="px-3 py-1.5 text-sm bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-700 dark:text-green-200 rounded transition-colors"
			>
				Download
			</button>
		</div>
	{/if}
</div>
