<script lang="ts">
	import type { GenerationRequestDtoResponse } from "@api/shared";
	import GenerationListItem from "./GenerationListItem.svelte";
	import Pagination from "../common/Pagination.svelte";
	import { Heading } from "flowbite-svelte";
	import { FileLinesOutline } from "flowbite-svelte-icons";

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
		onPaymentSuccess?: (id: number) => void;
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
		onPaymentSuccess,
	}: Props = $props();
</script>

<div class="space-y-4">
	<!-- Header -->
	<Heading tag="h2">Your Generations</Heading>

	<!-- Empty State -->
	{#if items.length === 0}
		<div class="text-center py-12 rounded-lg border-2 border-dashed">
			<FileLinesOutline class="mx-auto h-12 w-12" />
			<p class="mt-4">No generations yet. Create your first one!</p>
		</div>
	{:else}
		<!-- List -->
		<div class="space-y-3">
			{#each items as item (item.id)}
				<GenerationListItem
					{item}
					progress={progressMap[item.generation.id]}
					{onDelete}
					{onPaymentSuccess} />
			{/each}
		</div>

		<!-- Pagination -->
		{#if total > limit}
			<Pagination {page} {limit} {total} {onPageChange} {onLimitChange} />
		{/if}
	{/if}
</div>
