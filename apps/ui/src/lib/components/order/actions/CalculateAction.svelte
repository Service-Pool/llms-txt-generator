<script lang="ts">
	import { Button, SpeedDialButton } from 'flowbite-svelte';
	import type { OrderResponseDto, CreateOrderResponseDto } from '@api/shared';
	import { getActionConfig } from '$lib/components/order-actions.config';

	interface Props {
		order: OrderResponseDto | CreateOrderResponseDto;
		open?: boolean;
		mode?: 'card' | 'spd-button';
		loading?: boolean;
		showButton?: boolean;
	}

	let { order, open = $bindable(false), mode = 'card', loading = false, showButton = true }: Props = $props();

	const config = getActionConfig('calculate')!;
	const label = $derived(
		'currentAiModel' in order.attributes && order.attributes.currentAiModel ? config.labelAlternative : config.label
	);
</script>

{#if showButton}
	{#if mode === 'spd-button'}
		<!-- Button mode for SpeedDial -->
		<SpeedDialButton
			name={label}
			color={config.color}
			class="w-10 h-10 shadow-md"
			pill
			onclick={() => (open = true)}
			disabled={loading || open}
		>
			<config.icon size="md" />
		</SpeedDialButton>
	{:else}
		<!-- Card mode for accordion -->
		<div class="p-4 rounded-lg border {config.cardBgClass}">
			<div class="flex items-center justify-between">
				<div>
					<div class="font-semibold text-gray-900 dark:text-white">
						<config.icon size="sm" class="inline me-2 {config.iconColorClass}" />
						{config.description}
					</div>
					<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
						Current: <span class="font-semibold">
							{'currentAiModel' in order.attributes ? (order.attributes.currentAiModel?.displayName ?? '—') : '—'}
						</span>
					</p>
				</div>
				<Button
					onclick={() => (open = true)}
					color={config.color}
					loading={loading || open}
					size="sm"
					class="min-w-25 whitespace-nowrap">{label}</Button
				>
			</div>
		</div>
	{/if}
{/if}
