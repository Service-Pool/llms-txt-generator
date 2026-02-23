<script lang="ts">
	import type { OrderResponseDto } from '@api/shared';
	import type { TransitionDescriptorInterface, ActionRendererPropsInterface } from '$lib/domain/order';
	import type { Component } from 'svelte';
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

	let isDeleting = $state(false);
	const isLoading = $derived(loading || isDeleting);
	const Renderer = $derived(renderer);

	const handleDelete = async () => {
		const confirmed = confirm(
			`Are you sure you want to delete order #${order.attributes.id}? This action cannot be undone.`
		);

		if (!confirmed) {
			return;
		}

		isDeleting = true;
		try {
			await ordersStore.deleteOrder(order.attributes.id);
		} catch (exception) {
			console.error('Delete failed:', exception);
			throw exception;
		} finally {
			isDeleting = false;
		}
	};
</script>

<!--
  DeleteAction

  ПРАВИЛА:
  ✅ Удаляет заказ через store (ordersStore.deleteOrder)
  ✅ Показывает confirm dialog перед удалением
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
<Renderer {transition} onclick={handleDelete} class={className} disabled={disabled || isLoading} loading={isLoading} />
