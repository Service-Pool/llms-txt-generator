<script lang="ts">
	import { Radio } from 'flowbite-svelte';
	import { GenerationStrategy } from '@api/shared';

	interface StrategyOption {
		value: GenerationStrategy;
		label: string;
		description: string;
	}

	interface Props {
		selectedStrategy: GenerationStrategy | null;
		disabled?: boolean;
		onSelect: (strategy: GenerationStrategy) => void;
		class?: string;
	}

	let { selectedStrategy, disabled = false, onSelect, class: className = '' }: Props = $props();

	const strategies: StrategyOption[] = [
		{
			value: GenerationStrategy.FLAT,
			label: 'Flat',
			description: 'Each page is summarized individually. Fast and straightforward.'
		},
		{
			value: GenerationStrategy.CLUSTERED,
			label: 'Clustered',
			description:
				'Pages are grouped by semantic similarity before summarization. Produces richer navigation structure.'
		}
	];
</script>

<div class="flex flex-col gap-3 {className}">
	{#each strategies as strategy (strategy.value)}
		<label class="flex items-start gap-3 cursor-pointer {disabled ? 'opacity-50 pointer-events-none' : ''}">
			<Radio
				name="generation-strategy"
				value={strategy.value}
				group={selectedStrategy}
				{disabled}
				onchange={() => onSelect(strategy.value)}
				class="mt-1.5"
			/>
			<div>
				<span class="text-sm font-medium text-gray-900 dark:text-white">{strategy.label}</span>
				<p class="text-xs text-gray-500 dark:text-gray-400">{strategy.description}</p>
			</div>
		</label>
	{/each}
</div>
