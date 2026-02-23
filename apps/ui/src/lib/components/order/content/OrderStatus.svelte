<script lang="ts">
	import { Badge } from 'flowbite-svelte';
	import type { OrderStatus } from '@api/shared';
	import { ordersService } from '$lib/services/orders.service';

	interface Props {
		status: OrderStatus;
		large?: boolean;
		class?: string;
		icon?: import('svelte').Snippet;
	}

	let { status, large = false, class: className = '', icon }: Props = $props();

	const config = $derived(ordersService.getStatusConfig(status));
</script>

<!--
  OrderStatus

  Content component - визуализация статуса заказа.
  НЕ содержит бизнес-логику, только визуализацию.
-->
<Badge color={config.color} {large} class="px-1.5 py-0.5 inline-flex items-center gap-1 whitespace-nowrap {className}">
	{config.label}
	{#if icon}
		{@render icon()}
	{/if}
</Badge>
