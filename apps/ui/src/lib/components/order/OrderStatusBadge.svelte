<script lang="ts">
	import { Badge } from 'flowbite-svelte';
	import type { OrderStatus } from '@api/shared';
	import { ordersService } from '$lib/services/orders.service';

	interface Props {
		status: OrderStatus;
		large?: boolean;
		class?: string;
	}

	let { status, large = false, class: className = '' }: Props = $props();

	const config = $derived(ordersService.getStatusConfig(status));
</script>

<Badge color={config.color} {large} class={className}>
	{config.label}
</Badge>
