<script lang="ts">
	interface Props {
		page: number;
		limit: number;
		total: number;
		onPageChange: (page: number) => void;
		onLimitChange: (limit: number) => void;
	}

	let { page, limit, total, onPageChange, onLimitChange }: Props = $props();

	const totalPages = $derived(Math.ceil(total / limit) || 1);
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

<div class="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
	<div class="text-sm text-gray-600 dark:text-gray-400">
		Page {page} of {totalPages} ({total} total)
	</div>

	<div class="flex items-center gap-4">
		<!-- Items per page select -->
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

		<!-- Navigation buttons -->
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
</div>
