<script lang="ts">
	import { Button } from 'flowbite-svelte';
	import { getActionConfig } from '$lib/config/order-actions.config';
	import { paymentsService } from '$lib/services/payments.service';
	import { ordersStore } from '$lib/stores/orders.store.svelte';
	import { configService } from '$lib/services/config.service';
	import StripeElementsModal from '$lib/components/payment/StripeElementsModal.svelte';
	import type { OrderResponseDto } from '@api/shared';

	const config = getActionConfig('payment')!;

	interface Props {
		order: OrderResponseDto;
		mode?: 'card' | 'button';
		disabled?: boolean;
		loading?: boolean;
	}

	let { order, mode = 'card', disabled = false, loading = false }: Props = $props();

	let isPaying = $state(false);
	let showPaymentModal = $state(false);
	let clientSecret = $state<string | null>(null);
	let publishableKey = $state<string | null>(null);

	const isProcessing = $derived(isPaying || loading);

	const handlePay = async () => {
		isPaying = true;

		try {
			switch (configService.stripe.paymentMethod) {
				case 'elements': {
					// Stripe Elements - modal form
					const response = await paymentsService.createPaymentIntent(order.id);
					const data = response.getData();

					clientSecret = data.clientSecret;
					publishableKey = data.publishableKey;
					showPaymentModal = true;
					break;
				}

				case 'checkout': {
					// Stripe Checkout - redirect
					const response = await paymentsService.createSession(order.id);
					const data = response.getData();
					if (data.paymentUrl) {
						await ordersStore.refreshOrder(order.id);
						window.location.href = data.paymentUrl;
					}
					break;
				}

				default:
					throw new Error(`Unsupported payment method: ${configService.stripe.paymentMethod}`);
			}
		} catch (exception) {
			throw exception;
		} finally {
			isPaying = false;
		}
	};

	const handlePaymentSuccess = async () => {
		showPaymentModal = false;
		await ordersStore.refreshOrder(order.id);
	};

	const handlePaymentClose = () => {
		showPaymentModal = false;
		clientSecret = null;
		publishableKey = null;
	};
</script>

{#if mode === 'button'}
	<!-- Button mode for SpeedDial -->
	<Button
		size="xs"
		color={config.color}
		pill
		class="justify-start shadow-md whitespace-nowrap"
		onclick={handlePay}
		disabled={disabled || isProcessing}
		loading={isProcessing}
	>
		<config.icon class="w-5 h-5 me-2" />
		{config.label}
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
					Total: <span class="font-semibold">{order.currencySymbol}{order.priceTotal?.toFixed(2)}</span>
				</p>
			</div>
			<Button
				onclick={handlePay}
				color={config.color}
				size="sm"
				class="min-w-25 whitespace-nowrap"
				spinnerProps={{ type: 'dots', size: '5', color: 'teal' }}
				loading={isProcessing}
				{disabled}
			>
				{config.label}
			</Button>
		</div>
	</div>
{/if}

{#if showPaymentModal && clientSecret && publishableKey}
	<StripeElementsModal {clientSecret} {publishableKey} onSuccess={handlePaymentSuccess} onClose={handlePaymentClose} />
{/if}
