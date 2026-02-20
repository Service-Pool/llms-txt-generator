<script lang="ts">
	import { PaginationNav, Pagination, Dropdown, DropdownItem, Button } from 'flowbite-svelte';
	import { ChevronLeftOutline, ChevronRightOutline, ChevronDownOutline } from 'flowbite-svelte-icons';

	interface Props {
		page: number;
		limit: number;
		total: number;
		onPageChange: (page: number) => void;
		onLimitChange: (limit: number) => void;
	}

	let { page, limit, total, onPageChange, onLimitChange }: Props = $props();

	const totalPages = $derived(Math.ceil(total / limit) || 1);
	const limitOptions = [5, 10, 20, 50];

	const handlePageChange = (newPage: number) => {
		onPageChange(newPage);
	};

	const previous = () => {
		if (page > 1) {
			onPageChange(page - 1);
		}
	};

	const next = () => {
		if (page < totalPages) {
			onPageChange(page + 1);
		}
	};
</script>

<div class="flex items-center justify-between flex-wrap gap-4">
	<div class="text-sm">
		<span class="text-sm opacity-75 whitespace-nowrap">Page {page} of {totalPages} ({total} total)</span>
	</div>

	<div class="flex flex-1 items-center gap-4">
		<!-- Items per page dropdown -->
		<div class="flex items-center gap-2">
			<span class="text-sm opacity-75 whitespace-nowrap">Per page:</span>
			<Button size="xs" color="light">
				{limit}
				<ChevronDownOutline class="w-3 h-3 ml-1" />
			</Button>
			<Dropdown simple class="w-20">
				{#each limitOptions as option}
					<DropdownItem
						onclick={() => onLimitChange(option)}
						class={limit === option ? 'bg-gray-100 dark:bg-gray-600' : ''}
					>
						{option}
					</DropdownItem>
				{/each}
			</Dropdown>
		</div>

		<!-- Desktop Navigation -->
		<div class="hidden md:flex">
			<PaginationNav currentPage={page} {totalPages} onPageChange={handlePageChange} size="default">
				{#snippet prevContent()}
					<span class="sr-only">Previous</span>
					<ChevronLeftOutline size="md" />
				{/snippet}
				{#snippet nextContent()}
					<span class="sr-only">Next</span>
					<ChevronRightOutline size="md" />
				{/snippet}
			</PaginationNav>
		</div>

		<!-- Mobile Navigation -->
		<div class="flex md:hidden">
			<Pagination {previous} {next}>
				{#snippet prevContent()}
					<div class="flex items-center gap-1">
						<span class="sr-only">Previous</span>
						<ChevronLeftOutline size="sm" />
					</div>
				{/snippet}
				{#snippet nextContent()}
					<div class="flex items-center gap-1">
						<span class="sr-only">Next</span>
						<ChevronRightOutline size="sm" />
					</div>
				{/snippet}
			</Pagination>
		</div>
	</div>
</div>
