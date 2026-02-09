<script lang="ts">
	import { Button } from 'flowbite-svelte';
	import type { OrderResponseDto, CreateOrderResponseDto } from '@api/shared';
	import { getActionConfig } from '$lib/config/order-actions.config';

	interface Props {
		order: OrderResponseDto | CreateOrderResponseDto;
		open?: boolean;
		mode?: 'card' | 'button';
		disabled?: boolean;
		loading?: boolean;
		showButton?: boolean;
	}

	let {
		order,
		open = $bindable(false),
		mode = 'card',
		disabled = false,
		loading = false,
		showButton = true
	}: Props = $props();

	const config = getActionConfig('calculate')!;
	const label = $derived('currentAiModel' in order && order.currentAiModel ? config.labelAlternative : config.label);
</script>

{#if showButton}
	{#if mode === 'button'}
		<!-- Button mode for SpeedDial -->
		<Button
			size="xs"
			color={config.color}
			pill
			class="justify-start shadow-md whitespace-nowrap"
			onclick={() => (open = true)}
			{disabled}
			loading={loading || open}
		>
			<config.icon class="w-5 h-5 me-2" />
			{label}
		</Button>
	{:else}
		<!-- Card mode for accordion -->
		<div class="p-4 rounded-lg border {config.cardBgClass}">
			<div class="flex items-center justify-between">
				<div>
					<div class="font-semibold text-gray-900 dark:text-white">
						<config.icon class="w-4 h-4 inline me-2 {config.iconColorClass}" />
						{config.description}
					</div>
					<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
						Current: <span class="font-semibold">
							{'currentAiModel' in order ? (order.currentAiModel?.displayName ?? '—') : '—'}
						</span>
					</p>
				</div>
				<Button
					onclick={() => (open = true)}
					color={config.color}
					{disabled}
					loading={loading || open}
					size="sm"
					class="min-w-25 whitespace-nowrap">{label}</Button
				>
			</div>
		</div>
	{/if}
{/if}
