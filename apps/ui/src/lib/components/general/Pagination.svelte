<script lang="ts">
	import { PaginationNav, Dropdown, DropdownItem, Button } from 'flowbite-svelte';
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
</script>

<div class="flex items-center justify-between">
	<div class="text-sm opacity-75">
		Page {page} of {totalPages} ({total} total)
	</div>

	<div class="flex items-center gap-4">
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

		<!-- Navigation -->
		<PaginationNav currentPage={page} {totalPages} onPageChange={handlePageChange} size="large">
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
