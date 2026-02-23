<script lang="ts">
	import { type OrderResponseDto } from '@api/shared';
	import { List, Li, Indicator } from 'flowbite-svelte';

	interface Props {
		order: OrderResponseDto;
		class?: string;
	}

	let { order, class: className = '' }: Props = $props();
</script>

<!--
  OrderErrors

  Content component — список ошибок заказа.
  Рендерится только при наличии ошибок. Без API вызовов — только чтение order.attributes.errors.
-->
{#if order.attributes.errors && order.attributes.errors.length > 0}
	<div class={className}>
		<div class="flex items-center gap-2 mb-2">
			<span>Errors: ({order.attributes.errors.length})</span>
			<Indicator size="xs" color="red" />
		</div>

		<List tag="ul" class="space-y-1">
			{#each order.attributes.errors as errMsg}
				<Li>{errMsg}</Li>
			{/each}
		</List>
	</div>
{/if}
