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

	let isDownloading = $state(false);
	const isLoading = $derived(loading || isDownloading);
	const Renderer = $derived(renderer);

	const handleDownload = async (event?: MouseEvent) => {
		event?.stopPropagation();

		isDownloading = true;
		try {
			const response = await ordersService.download(order.attributes.id);
			const data = response.getData().attributes;

			// Create blob and download
			const blob = new Blob([data.content], { type: 'text/plain' });
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = data.filename;
			a.style.display = 'none';
			a.addEventListener('click', (e) => e.stopPropagation());
			document.body.appendChild(a);
			a.click();

			// Cleanup
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (exception) {
			console.error('Download failed:', exception);
			throw exception;
		} finally {
			isDownloading = false;
		}
	};
</script>

<!--
  DownloadAction

  ПРАВИЛА:
  ✅ Скачивает файл через API (ordersService.download)
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
	onclick={handleDownload}
	class={className}
	disabled={disabled || isLoading}
	loading={isLoading}
/>
