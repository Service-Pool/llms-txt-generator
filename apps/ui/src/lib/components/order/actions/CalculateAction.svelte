<script lang="ts">
	import type { TransitionDescriptorInterface, ActionRendererPropsInterface } from '$lib/domain/order';
	import type { Component } from 'svelte';

	interface Props {
		transition: TransitionDescriptorInterface;
		renderer: Component<ActionRendererPropsInterface>;
		onOpenCalculateModal?: () => void;
		class?: string;
		disabled?: boolean;
		loading?: boolean;
	}

	let {
		transition,
		renderer,
		onOpenCalculateModal,
		class: className = '',
		disabled = false,
		loading = false
	}: Props = $props();

	const Renderer = $derived(renderer);

	const handleClick = () => {
		onOpenCalculateModal?.();
	};
</script>

<!--
  CalculateAction

  ПРАВИЛА:
  ✅ Управляет модалкой (открывает CalculateModal)
  ✅ Рендерит переданный renderer с onclick
  ✅ НЕ ПРОВЕРЯЕТ enabled (transition УЖЕ доступен из domain)
  ✅ НЕ ОБРАЩАЕТСЯ к ordersService для проверок
  ❌ НЕ знает о визуализации (это в renderer)
  ❌ НЕ имеет mode prop (renderer передаётся снаружи)

  Props:
  - transition: TransitionDescriptor - описание действия (из domain)
  - renderer: Component - компонент для отображения (ActionButton, ActionSpeedDialButton, etc)
  - class: string - CSS classes для renderer
  - disabled: boolean - состояние disabled
  - loading: boolean - состояние loading
-->
<Renderer {transition} onclick={handleClick} class={className} {disabled} {loading} />
