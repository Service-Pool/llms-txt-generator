<script lang="ts">
	import type { TransitionDescriptorInterface } from '$lib/domain/order';
	import { SpeedDialButton } from 'flowbite-svelte';

	interface Props {
		transition: TransitionDescriptorInterface;
		onclick: () => void;
		class?: string;
		disabled?: boolean;
	}

	let { transition, onclick, class: className = '', disabled = false }: Props = $props();

	// Icon component from transition (derived for reactivity)
	const Icon = $derived(transition.icon);
</script>

<!--
  ActionSpeedDialButton Renderer

  ПРАВИЛА:
  ✅ ТОЛЬКО визуализация (иконка в SpeedDial)
  ✅ НЕ ПРОВЕРЯЕТ доступность (transition УЖЕ доступен из domain)
  ✅ НЕ СОДЕРЖИТ бизнес-логику
  ✅ Просто рендерит SpeedDialButton с transition.icon
  ❌ НЕ решает что показывать (не вызывает getAvailableTransitions)
  ❌ НЕ знает о модалках, API, domain

  Props:
  - transition: TransitionDescriptor - данные для отображения
  - onclick: () => void - обработчик клика (взаимодействие в Action компоненте)
  - class: string - стили (передаются снаружи)
  - disabled: boolean - состояние disabled
-->
<SpeedDialButton
	pill
	name={transition.label}
	{onclick}
	{disabled}
	color={transition.color}
	class={className}
	title={transition.description}
>
	<Icon size="sm" />
</SpeedDialButton>
