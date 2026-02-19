<script lang="ts">
	import { Button, SpeedDialButton } from 'flowbite-svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getActionConfig } from '$lib/components/order-actions.config';
	import { paymentsService } from '$lib/services/payments.service';
	import { authStore } from '$lib/stores/auth.store.svelte';
	import { configService } from '$lib/services/config.service';
	import type { OrderResponseDto } from '@api/shared';

	const config = getActionConfig('payment')!;

	interface Props {
		class?: string;
		order: OrderResponseDto;
		open?: boolean;
		clientSecret?: string | null;
		publishableKey?: string | null;
		mode?: 'spd-button' | 'stepper';
		loading?: boolean;
		disabled?: boolean;
	}

	let {
		class: className = '',
		order,
		open = $bindable(false),
		clientSecret = $bindable(null),
		publishableKey = $bindable(null),
		mode = 'stepper',
		loading = false,
		disabled = false
	}: Props = $props();

	const user = $derived($authStore.user);
	let isPaymentProcessing = $state(false);

	const handlePay = async () => {
		// Проверяем авторизацию пользователя
		if (!user) {
			const currentUrl = page.url.pathname + page.url.search;
			goto(`${configService.routes.auth.request}?redirectUrl=${encodeURIComponent(currentUrl)}`);
			return;
		}

		isPaymentProcessing = true;
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
			isPaymentProcessing = false;
		}
	};
</script>

{#if mode === 'stepper'}
	<!-- Small button mode for stepper -->
	<Button
		size="lg"
		color={config.color}
		onclick={handlePay}
		disabled={disabled || loading || isPaymentProcessing || open}
		loading={isPaymentProcessing}
		class="whitespace-nowrap {className}"
	>
		{config.label}
	</Button>
{:else if mode === 'spd-button'}
	<!-- Button mode for SpeedDial -->
	<SpeedDialButton name={config.label} color={config.color} class={className} pill onclick={handlePay}>
		<config.icon size="md" />
	</SpeedDialButton>
{/if}
