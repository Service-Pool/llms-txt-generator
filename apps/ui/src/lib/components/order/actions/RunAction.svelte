<script lang="ts">
	import type { OrderResponseDto } from '@api/shared';
	import { OrderStatus } from '@api/shared';
	import type { TransitionDescriptorInterface, ActionRendererPropsInterface } from '$lib/domain/order';
	import type { Component } from 'svelte';
	import { ordersService } from '$lib/services/orders.service';
	import { ordersStore } from '$lib/stores/orders.store.svelte';

	interface Props {
		order: OrderResponseDto;
		transition: TransitionDescriptorInterface;
		renderer: Component<ActionRendererPropsInterface>;
		class?: string;
		disabled?: boolean;
		loading?: boolean;
	}

	let { order, transition, renderer, class: className = '', disabled = false, loading = false }: Props = $props();

	let isRunning = $state(false);
	const isLoading = $derived(loading || isRunning);
	const Renderer = $derived(renderer);
	const actionLabel = $derived(
		order.attributes.status === OrderStatus.FAILED ? (transition.labelAlternative || transition.label) : transition.label
	);

	const handleRun = async () => {
		if (!order.attributes.currentAiModel) {
			console.error('Cannot run: no AI model selected');
			return;
		}

		isRunning = true;
		try {
			const response = await ordersService.start(order.attributes.id, order.attributes.currentAiModel.id);
			const updatedOrder = response.getData();
			ordersStore.updateOrder(updatedOrder);
		} catch (exception) {
			console.error('Failed to start order:', exception);
			throw exception;
		} finally {
			isRunning = false;
		}
	};
</script>

<!--
  RunAction

  ПРАВИЛА:
  ✅ Выполняет API запрос (ordersService.start)
  ✅ Обновляет store после успешного запроса
  ✅ Рендерит переданный renderer с onclick
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
	label={actionLabel}
	onclick={handleRun}
	class={className}
	disabled={disabled || isLoading}
	loading={isLoading}
/>
