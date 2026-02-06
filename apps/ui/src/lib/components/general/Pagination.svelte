<script lang="ts">
	import { PaginationNav, Select, Label } from "flowbite-svelte";
	import {
		ChevronLeftOutline,
		ChevronRightOutline,
	} from "flowbite-svelte-icons";

	interface Props {
		page: number;
		limit: number;
		total: number;
		onPageChange: (page: number) => void;
		onLimitChange: (limit: number) => void;
	}

	let { page, limit, total, onPageChange, onLimitChange }: Props = $props();

	const uniqueId = `limit-${Math.random().toString(36).substring(2, 9)}`;

	const totalPages = $derived(Math.ceil(total / limit) || 1);
	const limitOptions = [
		{ value: 5, name: "5" },
		{ value: 10, name: "10" },
		{ value: 20, name: "20" },
		{ value: 50, name: "50" },
	];

	const handlePageChange = (newPage: number) => {
		onPageChange(newPage);
	};

	const handleLimitChange = (e: Event) => {
		const select = e.target as HTMLSelectElement;
		onLimitChange(Number(select.value));
	};
</script>

<div class="flex items-center justify-between">
	<div class="text-sm opacity-75">
		Page {page} of {totalPages} ({total} total)
	</div>

	<div class="flex items-center gap-4">
		<!-- Items per page select -->
		<div class="flex items-center gap-2">
			<Label for={uniqueId} class="text-sm opacity-75 whitespace-nowrap"
				>Per page:</Label>
			<Select
				id={uniqueId}
				size="sm"
				class="min-w-16"
				items={limitOptions}
				bind:value={limit}
				onchange={handleLimitChange} />
		</div>

		<!-- Navigation -->
		<PaginationNav
			currentPage={page}
			{totalPages}
			onPageChange={handlePageChange}
			size="default">
			{#snippet prevContent()}
				<span class="sr-only">Previous</span>
				<ChevronLeftOutline class="h-5 w-5" />
			{/snippet}
			{#snippet nextContent()}
				<span class="sr-only">Next</span>
				<ChevronRightOutline class="h-5 w-5" />
			{/snippet}
		</PaginationNav>
	</div>
</div>
