<script lang="ts">
	import type { OrderResponseDto } from '@api/shared';
	import type { TransitionDescriptorInterface, ActionRendererPropsInterface } from '$lib/domain/order';
	import type { Component } from 'svelte';
	import { paymentsService } from '$lib/services/payments.service';
	import { ordersStore } from '$lib/stores/orders.store.svelte';
	import { formatPrice } from '$lib/utils/number-format';

	interface Props {
		order: OrderResponseDto;
		transition: TransitionDescriptorInterface;
		renderer: Component<ActionRendererPropsInterface>;
		class?: string;
		disabled?: boolean;
		loading?: boolean;
		size?: ActionRendererPropsInterface['size'];
	}

	let { order, transition, renderer, class: className = '', disabled = false, loading = false, size }: Props = $props();

	let isRefunding = $state(false);
	const isLoading = $derived(loading || isRefunding);
	const Renderer = $derived(renderer);

	const handleRefund = async () => {
		const amount = `${order.attributes.currencySymbol} ${formatPrice(order.attributes.priceTotal || 0)}`;
		const confirmed = confirm(
			`Are you sure you want to refund ${amount} for order #${order.attributes.id}? This action cannot be undone.`
		);

		if (!confirmed) {
			return;
		}

		isRefunding = true;
		try {
			await paymentsService.requestRefund(order.attributes.id);
			await ordersStore.refreshOrder(order.attributes.id);
		} catch (exception) {
			console.error('Refund failed:', exception);
			throw exception;
		} finally {
			isRefunding = false;
		}
	};
</script>

<!--
  RefundAction

  ПРАВИЛА:
  ✅ Запрашивает возврат через paymentsService.requestRefund()
  ✅ Показывает confirm dialog с суммой перед возвратом
  ✅ Рендерит переданный renderer с onclick
  ✅ Обновляет заказ после успешного возврата
  ✅ НЕ ПРОВЕРЯЕТ enabled (transition УЖЕ доступен из domain)
  ❌ НЕ знает о визуализации (это в renderer)
  ❌ НЕ имеет mode prop (renderer передаётся снаружи)

  Props:
  - order: OrderResponseDto - данные заказа
  - transition: TransitionDescriptor - описание действия (из domain)
  - renderer: Component - компонент для отображения
  - class: string - CSS classes для renderer
  - disabled: boolean - состояние disabled
  - loading: boolean - состояние loading (external)
-->
<Renderer
	{transition}
	label={transition.label}
	onclick={handleRefund}
	class={className}
	disabled={disabled || isLoading}
	loading={isLoading}
	{size}
/>
