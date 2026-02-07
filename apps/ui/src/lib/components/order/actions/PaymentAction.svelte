<script lang="ts">
	import { Button } from 'flowbite-svelte';
	import { CashSolid } from 'flowbite-svelte-icons';
	import type { OrderResponseDto } from '@api/shared';

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
			console.log('Initiate payment');
			onUpdate?.();
		} catch (error) {
			console.error('Payment failed:', error);
		} finally {
			isPaying = false;
		}
	};
</script>

<div class="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
	<div class="flex items-center justify-between">
		<div>
			<div class="font-semibold text-gray-900 dark:text-white">
				<CashSolid class="w-4 h-4 inline me-2 text-green-600 dark:text-green-400" />
				Payment Required
			</div>
			<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
				Total: <span class="font-semibold">{order.currencySymbol}{order.priceTotal?.toFixed(2)}</span>
			</p>
		</div>
		<Button color="green" disabled={isPaying} onclick={handlePay}>
			{isPaying ? 'Processing...' : 'Checkout & Pay'}
		</Button>
	</div>
</div>
