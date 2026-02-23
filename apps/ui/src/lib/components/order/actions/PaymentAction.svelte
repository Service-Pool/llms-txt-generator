<script lang="ts">
	import type { OrderResponseDto } from '@api/shared';
	import type { TransitionDescriptorInterface, ActionRendererPropsInterface } from '$lib/domain/order';
	import type { Component } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { get } from 'svelte/store';
	import { paymentsService } from '$lib/services/payments.service';
	import { authStore } from '$lib/stores/auth.store.svelte';
	import { configService } from '$lib/services/config.service';

	interface Props {
		order: OrderResponseDto;
		transition: TransitionDescriptorInterface;
		renderer: Component<ActionRendererPropsInterface>;
		onOpenPaymentModal?: (clientSecret: string, publishableKey: string) => void;
		class?: string;
		disabled?: boolean;
		loading?: boolean;
	}

	let {
		order,
		transition,
		renderer,
		onOpenPaymentModal,
		class: className = '',
		disabled = false,
		loading = false
	}: Props = $props();

	let isPaymentProcessing = $state(false);

	const isLoading = $derived(loading || isPaymentProcessing);
	const Renderer = $derived(renderer);

	const handlePay = async () => {
		// Check user auth
		const authState = get(authStore);
		if (!authState.user) {
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

					// Call parent callback to open modal
					onOpenPaymentModal?.(data.clientSecret, data.publishableKey);
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
			console.error('Payment failed:', exception);
			throw exception;
		} finally {
			isPaymentProcessing = false;
		}
	};
</script>

<!--
  PaymentAction

  ПРАВИЛА:
  ✅ Создаёт payment intent/session через API
  ✅ Открывает модалку (Stripe Elements) или редиректит (Stripe Checkout)
  ✅ Проверяет авторизацию пользователя
  ✅ Обновляет store после успешной оплаты
  ✅ Рендерит переданный renderer с onclick
  ✅ НЕ ПРОВЕРЯЕТ enabled (transition УЖЕ доступен из domain)
  ❌ НЕ знает о визуализации (это в renderer)
  ❌ НЕ имеет mode prop (renderer передаётся снаружи)

  Props:
  - order: OrderResponseDto - данные заказа (для API вызовов)
  - transition: TransitionDescriptor - описание действия (из domain)
  - renderer: Component - компонент для отображения
  - class: string - CSS classes для renderer
  - disabled: boolean - состояние disabled
  - loading: boolean - состояние loading
-->
<Renderer {transition} onclick={handlePay} class={className} disabled={disabled || isLoading} loading={isLoading} />
