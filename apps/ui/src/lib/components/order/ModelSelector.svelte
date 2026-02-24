<script lang="ts">
	import { Card, Spinner } from 'flowbite-svelte';
	import { CheckCircleSolid } from 'flowbite-svelte-icons';
	import type { AvailableAiModelDto } from '@api/shared';
	import { formatPrice } from '$lib/utils/number-format';

	interface Props {
		availableModels: AvailableAiModelDto[];
		selectedModelId: string | null;
		disabled?: boolean;
		showSpinnerOnSelected?: boolean;
		onSelect: (modelId: string) => void;
		class?: string;
	}

	let {
		availableModels,
		selectedModelId,
		disabled = false,
		showSpinnerOnSelected = false,
		onSelect,
		class: className = ''
	}: Props = $props();

	const handleModelClick = (model: AvailableAiModelDto) => {
		if (model.available && !disabled) {
			onSelect(model.id);
		}
	};
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-4 {className}">
	{#each availableModels as model}
		<Card
			class="max-w-none p-4 h-full flex flex-col relative overflow-hidden cursor-pointer {selectedModelId === model.id
				? 'ring-2 ring-purple-500'
				: 'hover:ring-2 hover:ring-gray-300'} {disabled ? 'opacity-50 pointer-events-none' : ''} {!model.available
				? 'opacity-50 cursor-not-allowed'
				: ''}"
			onclick={() => handleModelClick(model)}
		>
			<div
				class="absolute inset-0 opacity-10 dark:invert"
				style="background-image: url('/pattern.svg'); background-size: cover; background-repeat: repeat;"
			></div>

			<div class="relative z-10 flex-1 space-y-3">
				<!-- Model Name & Category -->
				<div>
					<h5 class="text-lg font-medium text-gray-900 dark:text-white">
						{model.displayName}
						{#if showSpinnerOnSelected && disabled && selectedModelId === model.id}
							<Spinner size="4" class="inline-block ml-2" />
						{/if}
					</h5>
					<p class="text-xs text-gray-500 dark:text-gray-400 uppercase">
						{model.category}
					</p>
				</div>

				<!-- Price -->
				{#if model.totalPrice > 0}
					<div class="flex items-baseline">
						<span class="text-2xl font-semibold text-gray-900 dark:text-white">
							{model.currencySymbol}
						</span>
						<span class="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
							{formatPrice(model.totalPrice)}
						</span>
					</div>
				{:else}
					<div class="text-2xl font-semibold text-gray-900 dark:text-white">Free</div>
				{/if}

				<!-- Features -->
				<ul class="space-y-2">
					{#if model.description}
						<li class="flex items-start space-x-2">
							<CheckCircleSolid size="sm" class="text-purple-600 shrink-0 mt-0.5" />
							<span class="text-sm text-gray-700 dark:text-gray-300">
								{model.description}
							</span>
						</li>
					{/if}
					{#if model.pageLimit}
						<li class="flex items-start space-x-2">
							<CheckCircleSolid size="sm" class="text-purple-600 shrink-0 mt-0.5" />
							<span class="text-sm text-gray-700 dark:text-gray-300">
								Up to {model.pageLimit} pages
							</span>
						</li>
					{/if}
					{#if model.totalPrice > 0}
						<li class="flex items-start space-x-2">
							<CheckCircleSolid size="sm" class="text-purple-600 shrink-0 mt-0.5" />
							<span class="text-sm text-gray-700 dark:text-gray-300">Login required</span>
						</li>
					{/if}
				</ul>

				{#if !model.available}
					<p class="text-sm text-red-600 dark:text-red-400">
						{model.unavailableReason || 'Unavailable'}
					</p>
				{/if}
			</div>
		</Card>
	{/each}
</div>
