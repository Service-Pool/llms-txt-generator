<script lang="ts">
	import { Button } from 'flowbite-svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getActionConfig } from '$lib/components/order-actions.config';
	import { paymentsService } from '$lib/services/payments.service';
	import { ordersStore } from '$lib/stores/orders.store.svelte';
	import { authStore } from '$lib/stores/auth.store.svelte';
	import { configService } from '$lib/services/config.service';
	import type { OrderResponseDto } from '@api/shared';

	const config = getActionConfig('payment')!;

	interface Props {
		order: OrderResponseDto;
		open?: boolean;
		clientSecret?: string | null;
		publishableKey?: string | null;
		mode?: 'card' | 'button';
		loading?: boolean;
	}

	let {
		order,
		open = $bindable(false),
		clientSecret = $bindable(null),
		publishableKey = $bindable(null),
		mode = 'card',
		loading = false
	}: Props = $props();

	const isProcessing = $derived(loading || open);
	const user = $derived($authStore.user);

	const handlePay = async () => {
		// Проверяем авторизацию пользователя
		if (!user) {
			const currentUrl = page.url.pathname + page.url.search;
			goto(`${configService.routes.auth.request}?redirectUrl=${encodeURIComponent(currentUrl)}`);
			return;
		}

		try {
			switch (configService.stripe.paymentMethod) {
				case 'elements': {
					// Stripe Elements - modal form
					const response = await paymentsService.createPaymentIntent(order.attributes.id);
					const data = response.getData().attributes;

					clientSecret = data.clientSecret;
					publishableKey = data.publishableKey;
					open = true;
					break;
				}

				case 'checkout': {
					// Stripe Checkout - redirect
					const response = await paymentsService.createSession(order.attributes.id);
					const data = response.getData().attributes;
					if (data.paymentUrl) {
						await ordersStore.refreshOrder(order.attributes.id);
						window.location.href = data.paymentUrl;
					}
					break;
				}

				default:
					throw new Error(`Unsupported payment method: ${configService.stripe.paymentMethod}`);
			}
		} catch (exception) {
			throw exception;
		}
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
		loading={isProcessing}
	>
		<config.icon size="md" class="me-2" />
		{config.label}
	</Button>
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
					Total: <span class="font-semibold"
						>{order.attributes.currencySymbol}{order.attributes.priceTotal?.toFixed(2)}</span
					>
				</p>
			</div>
			<Button
				onclick={handlePay}
				color={config.color}
				size="sm"
				class="min-w-25 whitespace-nowrap"
				spinnerProps={{ type: 'dots', size: '5', color: 'teal' }}
				loading={isProcessing}
			>
				{config.label}
			</Button>
		</div>
	</div>
{/if}
