<script lang="ts">
	import { Button } from 'flowbite-svelte';
	import { getActionConfig } from '$lib/config/order-actions.config';
	import type { OrderResponseDto } from '@api/shared';

	const config = getActionConfig('payment')!;

	interface Props {
		order: OrderResponseDto;
		onUpdate?: () => void;
	}

	let { order, onUpdate }: Props = $props();

	let isPaying = $state(false);

	const handlePay = async () => {
		isPaying = true;
		try {
			// TODO: Implement payment flow (Stripe checkout)
			onUpdate?.();
		} catch (exception) {
			throw exception;
		} finally {
			isPaying = false;
		}
	};
</script>

<div class="p-4 rounded-lg border {config.cardBgClass}">
	<div class="flex items-center justify-between">
		<div>
			<div class="font-semibold text-gray-900 dark:text-white">
				<config.icon class="w-4 h-4 inline me-2 {config.iconColorClass}" />
				{config.description}
			</div>
			<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
				Total: <span class="font-semibold">{order.currencySymbol}{order.priceTotal?.toFixed(2)}</span>
			</p>
		</div>
		<Button onclick={handlePay} color={config.color} size="sm" class="min-w-25 whitespace-nowrap" disabled={isPaying}>
			{isPaying ? 'Processing...' : config.label}
		</Button>
	</div>
</div>
