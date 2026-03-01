<script lang="ts">
	import type { OrderResponseDto } from '@api/shared';
	import type { Component } from 'svelte';
	import type { ActionRendererPropsInterface } from '$lib/domain/order';
	import { OrderStatusMachine, StepActionIdEnum } from '$lib/domain/order';
	import { CalculateAction, PaymentAction, RunAction, DownloadAction, DeleteAction } from '$lib/components/order';

	interface Props {
		order: OrderResponseDto;
		renderer: Component<ActionRendererPropsInterface>;
		onOpenPaymentModal?: (clientSecret: string, publishableKey: string) => void;
		onOpenCalculateModal?: () => void;
		class?: string;
	}

	let { order, renderer, onOpenPaymentModal, onOpenCalculateModal, class: className = '' }: Props = $props();

	// Get available transitions from domain
	const transitions = $derived(OrderStatusMachine.getAvailableTransitions(order));
</script>

<!--
  ActionsSpeedDial

  ПРАВИЛА:
  ✅ Композитный компонент - рендерит Action компоненты для SpeedDial
  ✅ Использует OrderStatusMachine для получения доступных переходов
  ✅ Рендерит Action компоненты с переданным renderer
  ✅ НЕ ПРОВЕРЯЕТ enabled (transitions УЖЕ доступны из domain)
  ❌ НЕ знает о конкретном renderer (передаётся снаружи)
  ❌ НЕ рендерит сам SpeedDial (это делает родитель)

  Props:
  - order: OrderResponseDto - данные заказа
  - renderer: Component - компонент для отображения (обычно ActionSpeedDialButton)
  - class: string - CSS classes для wrapper
-->
{#each transitions as transition}
	{#if transition.id === StepActionIdEnum.Calculate}
		<CalculateAction {order} {transition} {renderer} class={className} {onOpenCalculateModal} />
	{:else if transition.id === StepActionIdEnum.Payment}
		<PaymentAction {order} {transition} {renderer} class={className} {onOpenPaymentModal} />
	{:else if transition.id === StepActionIdEnum.Run}
		<RunAction {order} {transition} {renderer} class={className} />
	{:else if transition.id === StepActionIdEnum.Download}
		<DownloadAction {order} {transition} {renderer} class={className} />
	{:else if transition.id === StepActionIdEnum.Delete}
		<DeleteAction {order} {transition} {renderer} class={className} />
	{/if}
{/each}
