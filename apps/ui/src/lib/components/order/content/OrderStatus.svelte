<script lang="ts">
	import { Badge } from 'flowbite-svelte';
	import type { OrderStatus } from '@api/shared';
	import { configService } from '$lib/services/config.service';

	interface Props {
		status: OrderStatus;
		queuePosition?: number | null;
		large?: boolean;
		class?: string;
		icon?: import('svelte').Snippet;
	}

	let { status, queuePosition, large = false, class: className = '', icon }: Props = $props();

	const config = $derived(configService.orderStatuses[status] || { label: status, color: 'gray' });
	const showPosition = $derived(queuePosition !== null);
</script>

<!--
  OrderStatus

  Content component - визуализация статуса заказа.
  НЕ содержит бизнес-логику, только визуализацию.
-->
<Badge color={config.color} {large} class="px-1.5 py-0.5 inline-flex items-center gap-1 whitespace-nowrap {className}">
	{config.label}
	{#if showPosition}
		<span class="font-semibold">#{queuePosition}</span>
	{/if}
	{#if icon}
		{@render icon()}
	{/if}
</Badge>
