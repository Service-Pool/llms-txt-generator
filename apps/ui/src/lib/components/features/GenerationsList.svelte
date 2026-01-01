<script lang="ts">
	import type { GenerationRequestDtoResponse } from '@api/shared';
	import GenerationListItem from './GenerationListItem.svelte';

	interface Props {
		items: GenerationRequestDtoResponse[];
		total: number;
		page: number;
		limit: number;
		progressMap?: Record<number, { processedUrls: number; totalUrls: number }>;
		onPageChange: (page: number) => void;
		onLimitChange: (limit: number) => void;
		onDelete: (id: number) => void;
	}

	let {
		items = [],
		total = 0,
		page = 1,
		limit = 5,
		progressMap = {},
		onPageChange,
		onLimitChange,
		onDelete
	}: Props = $props();

	const totalPages = $derived(Math.ceil(total / limit));
	const hasNextPage = $derived(page < totalPages);
	const hasPrevPage = $derived(page > 1);

	const limitOptions = [5, 10, 20, 50];

	const handlePrevPage = () => {
		if (hasPrevPage) {
			onPageChange(page - 1);
		}
	};

	const handleNextPage = () => {
		if (hasNextPage) {
			onPageChange(page + 1);
		}
	};

	const handleLimitChange = (e: Event) => {
		const select = e.target as HTMLSelectElement;
		onLimitChange(Number(select.value));
	};
</script>

<div class="space-y-4">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<h2 class="text-2xl font-bold text-gray-900 dark:text-white">
			Your Generations
		</h2>

		<!-- Items per page -->
		<div class="flex items-center gap-2">
			<label for="limit" class="text-sm text-gray-600 dark:text-gray-400">
				Per page:
			</label>
			<select
				id="limit"
				value={limit}
				onchange={handleLimitChange}
				class="px-2 py-1 text-sm min-w-16 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
			>
				{#each limitOptions as option}
					<option value={option}>{option}</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- Empty State -->
	{#if items.length === 0}
		<div class="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
			<svg
				class="mx-auto h-12 w-12 text-gray-400"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
				/>
			</svg>
			<p class="mt-4 text-gray-600 dark:text-gray-400">
				No generations yet. Create your first one!
			</p>
		</div>
	{:else}
		<!-- List -->
		<div class="space-y-3">
			{#each items as item (item.id)}
				<GenerationListItem
					{item}
					progress={progressMap[item.generationId]}
					{onDelete}
				/>
			{/each}
		</div>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
				<div class="text-sm text-gray-600 dark:text-gray-400">
					Page {page} of {totalPages} ({total} total)
				</div>

				<div class="flex gap-2">
					<button
						onclick={handlePrevPage}
						disabled={!hasPrevPage}
						class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						Previous
					</button>

					<button
						onclick={handleNextPage}
						disabled={!hasNextPage}
						class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						Next
					</button>
				</div>
			</div>
		{/if}
	{/if}
</div>
