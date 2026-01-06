<script lang="ts">
	import type { GenerationRequestDtoResponse } from "@api/shared";
	import GenerationListItem from "./GenerationListItem.svelte";
	import Pagination from "../common/Pagination.svelte";

	interface Props {
		items: GenerationRequestDtoResponse[];
		total: number;
		page: number;
		limit: number;
		progressMap?: Record<
			number,
			{ processedUrls: number; totalUrls: number }
		>;
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
		onDelete,
	}: Props = $props();
</script>

<div class="space-y-4">
	<!-- Header -->
	<h2 class="text-2xl font-bold text-gray-900 dark:text-white">
		Your Generations
	</h2>

	<!-- Empty State -->
	{#if items.length === 0}
		<div
			class="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
			<svg
				class="mx-auto h-12 w-12 text-gray-400"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
					{onDelete} />
			{/each}
		</div>

		<!-- Pagination -->
		{#if total > limit}
			<Pagination {page} {limit} {total} {onPageChange} {onLimitChange} />
		{/if}
	{/if}
</div>
