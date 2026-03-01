<script lang="ts">
	import { type OrderResponseDto } from '@api/shared';
	import { List, Li, Indicator, Button } from 'flowbite-svelte';
	import { RedoOutline } from 'flowbite-svelte-icons';

	interface Props {
		order: OrderResponseDto;
		class?: string;
	}

	let { order, class: className = '' }: Props = $props();
	let wrapText = $state(false);
</script>

<!--
  OrderErrors

  Content component — список ошибок заказа.
  Рендерится только при наличии ошибок. Без API вызовов — только чтение order.attributes.errors.
-->
{#if order.attributes.errors && order.attributes.errors.length > 0}
	<div class={className}>
		<div class="flex items-center justify-between gap-2 mb-2">
			<div class="flex items-center gap-2">
				<span>Errors: ({order.attributes.errors.length})</span>
				<Indicator size="xs" color="red" />
			</div>
			<Button
				size="xs"
				color="light"
				class="p-1 ml-1"
				title={wrapText ? 'Disable text wrapping' : 'Enable text wrapping'}
				onclick={() => (wrapText = !wrapText)}
			>
				<RedoOutline class="w-4 h-4 rotate-180" />
			</Button>
		</div>

		<List tag="ul" class="py-2 space-y-1 overflow-auto max-h-60 font-mono {wrapText ? '' : 'whitespace-nowrap'}">
			{#each order.attributes.errors as errMsg}
				<Li><code>{errMsg}</code></Li>
			{/each}
		</List>
	</div>
{/if}
