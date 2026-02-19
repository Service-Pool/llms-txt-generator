<script lang="ts">
	import { Button, SpeedDialButton } from 'flowbite-svelte';
	import type { OrderResponseDto, CreateOrderResponseDto } from '@api/shared';
	import { getActionConfig } from '$lib/components/order-actions.config';

	interface Props {
		class?: string;
		order: OrderResponseDto | CreateOrderResponseDto;
		open?: boolean;
		mode?: 'spd-button' | 'stepper';
		loading?: boolean;
		disabled?: boolean;
	}

	let {
		class: className = '',
		order,
		open = $bindable(false),
		mode = 'stepper',
		loading = false,
		disabled = false
	}: Props = $props();

	const config = getActionConfig('calculate')!;
	const label = $derived(
		'currentAiModel' in order.attributes && order.attributes.currentAiModel ? config.labelAlternative : config.label
	);
</script>

{#if mode === 'stepper'}
	<!-- Small button mode for stepper -->
	<Button
		size="lg"
		color={config.color}
		onclick={() => (open = true)}
		disabled={disabled || loading || open}
		{loading}
		class="whitespace-nowrap {className}"
	>
		{label}
	</Button>
{:else if mode === 'spd-button'}
	<!-- Button mode for SpeedDial -->
	<SpeedDialButton name={label} color={config.color} class={className} pill onclick={() => (open = true)}>
		<config.icon size="md" />
	</SpeedDialButton>
{/if}
