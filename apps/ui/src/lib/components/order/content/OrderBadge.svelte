<script lang="ts">
	import { Badge } from 'flowbite-svelte';
	import type { OrderResponseDto } from '@api/shared';

	interface Props {
		order: OrderResponseDto;
		class?: string;
	}

	let { order, class: className = '' }: Props = $props();
</script>

<!--
  OrderBadge

  Content component - отображает ID заказа в виде бейджа.
  НЕ содержит бизнес-логику, только визуализацию.
-->
<Badge color="gray" class="px-2 {className}">#{order.attributes.id}</Badge>
