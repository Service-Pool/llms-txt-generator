<script lang="ts">
	import { Input, Button, Helper, Badge, Spinner } from 'flowbite-svelte';
	import { ordersService } from '$lib/services/orders.service';
	import VirtualList from '$lib/components/ui/virtual-list.svelte';

	interface Props {
		orderId: number;
		urlsTotal: number | null;
		urlsFiltered: number | null;
		urlListFilter: string | null;
		filter: string;
		disabled?: boolean;
		error?: string | null;
		class?: string;
		onApply: (filter: string) => Promise<void>;
	}

	let {
		orderId,
		urlsTotal,
		urlsFiltered,
		urlListFilter,
		filter = $bindable(),
		disabled = false,
		error = null,
		class: className = '',
		onApply
	}: Props = $props();

	let allUrls = $state<string[]>([]);
	let filteredUrls = $state<string[]>([]);
	let isLoadingUrls = $state(false);
	let showLists = $state(false);

	const loadUrls = async () => {
		isLoadingUrls = true;
		try {
			const response = await ordersService.getUrls(orderId);
			const data = response.getData();
			allUrls = data.attributes.all;
			filteredUrls = data.attributes.filtered;
		} finally {
			isLoadingUrls = false;
		}
	};

	const handleToggleLists = async () => {
		if (!showLists && allUrls.length === 0) {
			await loadUrls();
		}
		showLists = !showLists;
	};

	const handleApply = async () => {
		await onApply(filter);
		if (showLists) await loadUrls();
	};
</script>

<div class="space-y-2 {className}">
	<Badge rounded color="gray">URL Filter</Badge>

	<div class="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
		<span>{urlsTotal ?? 0} total</span>
		{#if urlListFilter}
			<span>→</span>
			<span class="text-green-600 dark:text-green-400 font-medium">{urlsFiltered} after filter</span>
		{/if}
		<button
			class="text-xs underline hover:no-underline"
			onclick={handleToggleLists}
			disabled={isLoadingUrls}
		>
			{#if isLoadingUrls}
				<Spinner size="4" class="inline" />
			{:else}
				{showLists ? 'hide' : 'show URLs'}
			{/if}
		</button>
	</div>

	<div class="flex items-start gap-2">
		<div class="flex-1">
			<Input
				bind:value={filter}
				placeholder="Regex filter, e.g. /api/ (optional)"
				{disabled}
				color={error ? 'red' : undefined}
			/>
			{#if error}
				<Helper color="red">{error}</Helper>
			{/if}
		</div>
		<Button color="light" {disabled} onclick={handleApply}>Apply</Button>
	</div>

	{#if showLists && allUrls.length > 0}
		<div class="grid grid-cols-2 gap-2">
			<div>
				<p class="text-xs text-gray-500 mb-1">All URLs ({allUrls.length})</p>
				<VirtualList
					items={allUrls}
					itemHeight={24}
					height="280px"
					class="border border-gray-200 dark:border-gray-700 rounded"
				>
					{#snippet children(url)}
						<div
							class="text-xs font-mono px-2 py-0.5 hover:bg-gray-50 dark:hover:bg-gray-800 truncate"
							title={url as string}
						>{url}</div>
					{/snippet}
				</VirtualList>
			</div>
			<div>
				<p class="text-xs text-gray-500 mb-1">After filter ({filteredUrls.length})</p>
				<VirtualList
					items={filteredUrls}
					itemHeight={24}
					height="280px"
					class="border border-gray-200 dark:border-gray-700 rounded"
				>
					{#snippet children(url)}
						<div
							class="text-xs font-mono px-2 py-0.5 hover:bg-gray-50 dark:hover:bg-gray-800 truncate text-green-700 dark:text-green-400"
							title={url as string}
						>{url}</div>
					{/snippet}
				</VirtualList>
			</div>
		</div>
	{/if}
</div>
