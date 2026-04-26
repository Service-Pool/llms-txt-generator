<script lang="ts">
	import type { OrderResponseDto } from '@api/shared';
	import type { TransitionDescriptorInterface, ActionRendererPropsInterface } from '$lib/domain/order';
	import type { Component } from 'svelte';
	import { ordersService } from '$lib/services/orders.service';

	interface Props {
		order: OrderResponseDto;
		transition: TransitionDescriptorInterface;
		renderer: Component<ActionRendererPropsInterface>;
		class?: string;
		disabled?: boolean;
		loading?: boolean;
	}

	let { order, transition, renderer, class: className = '', disabled = false, loading = false }: Props = $props();

	let isLoading = $state(false);
	const Renderer = $derived(renderer);

	const handleLoad = async () => {
		isLoading = true;
		try {
			const response = await ordersService.load(order.attributes.id);
			const data = response.getData().attributes;
			const blob = new Blob([data.content], { type: 'text/plain' });
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `llms-${order.attributes.hostname}.txt`;
			a.style.display = 'none';
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} finally {
			isLoading = false;
		}
	};
</script>

<!--
  LoadAction

  ПРАВИЛА:
  ✅ Скачивает файл через API (ordersService.load)
  ✅ Создаёт blob и auto-download
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
	label={transition.label}
	onclick={handleLoad}
	class={className}
	disabled={disabled || isLoading}
	loading={isLoading}
/>
