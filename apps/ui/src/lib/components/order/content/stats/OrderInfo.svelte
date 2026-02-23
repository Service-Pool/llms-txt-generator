<script lang="ts">
	import { type OrderResponseDto } from '@api/shared';

	interface Props {
		order: OrderResponseDto;
		class?: string;
	}

	let { order, class: className = '' }: Props = $props();
</script>

<!--
  OrderInfo

  Content component — временные метки заказа (created, updated, started, completed).
  Без API вызовов — только чтение order.attributes.
-->
<div class={className}>
	<div class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-2 text-xs">
		<div class="flex flex-col">
			<span class="stat-label">Created</span>
			<span class="stat-value">
				{order.attributes.createdAt
					? new Date(order.attributes.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
					: '—'}
			</span>
		</div>
		<div class="flex flex-col">
			<span class="stat-label">Updated</span>
			<span class="stat-value">
				{order.attributes.updatedAt
					? new Date(order.attributes.updatedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
					: '—'}
			</span>
		</div>
		<div class="flex flex-col">
			<span class="stat-label">Started</span>
			<span class="stat-value">
				{order.attributes.startedAt
					? new Date(order.attributes.startedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
					: '—'}
			</span>
		</div>
		<div class="flex flex-col">
			<span class="stat-label">Completed</span>
			<span class="stat-value">
				{order.attributes.completedAt
					? new Date(order.attributes.completedAt).toLocaleString(undefined, {
							dateStyle: 'short',
							timeStyle: 'short'
						})
					: '—'}
			</span>
		</div>
	</div>
</div>

<style>
	@reference "tailwindcss";

	.stat-label {
		@apply mt-1 text-gray-500;
	}

	.stat-value {
		@apply mt-1 font-medium text-gray-900;
	}

	:global(.dark) .stat-label {
		@apply text-gray-400;
	}

	:global(.dark) .stat-value {
		@apply font-medium text-white;
	}
</style>
