<script lang="ts">
	import type { TransitionDescriptorInterface } from '$lib/domain/order';
	import type { VariantProps } from 'tailwind-variants';
	import { Button, button } from 'flowbite-svelte';

	interface Props {
		transition: TransitionDescriptorInterface;
		onclick: () => void;
		class?: string;
		disabled?: boolean;
		loading?: boolean;
		size?: NonNullable<VariantProps<typeof button>['size']>;
		label: string;
	}

	let { transition, onclick, class: className = '', disabled = false, loading = false, size = 'md', label }: Props = $props();
</script>

<!--
  ActionButton Renderer

  ПРАВИЛА:
  ✅ ТОЛЬКО визуализация (красивая кнопка)
  ✅ НЕ ПРОВЕРЯЕТ доступность (transition УЖЕ доступен из domain)
  ✅ НЕ СОДЕРЖИТ бизнес-логику
  ✅ Просто рендерит Button с transition.label + transition.icon
  ❌ НЕ решает доступность (не вызывает canTransition)
  ❌ НЕ знает о модалках, API, domain

  Props:
  - transition: TransitionDescriptor - данные для отображения
  - onclick: () => void - обработчик клика (взаимодействие в Action компоненте)
  - class: string - стили (передаются снаружи)
  - disabled: boolean - состояние disabled
  - loading: boolean - состояние loading
-->
<div class="bg-white rounded z-10">
	<Button
		{size}
		color={transition.color}
		{disabled}
		{loading}
		{onclick}
		class={className}
		title={transition.description}
	>
		{label}
	</Button>
</div>
