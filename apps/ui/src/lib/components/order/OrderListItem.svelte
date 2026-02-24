<script lang="ts">
	import type { OrderResponseDto } from '@api/shared';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { SpeedDial, SpeedDialTrigger, Button } from 'flowbite-svelte';
	import { DotsVerticalOutline, ChevronDownOutline, ArrowUpRightFromSquareOutline } from 'flowbite-svelte-icons';
	import { fly } from 'svelte/transition';
	import { configService } from '$lib/services/config.service';
	import {
		OrderListItemLayout,
		ActionsSpeedDial,
		ActionSpeedDialButton,
		OrderBadge,
		OrderStatus,
		OrderMeta,
		OrderOutput,
		OrderErrors,
		OrderInfo,
		StripeElementsModal,
		CalculateModal
	} from '$lib/components/order';
	import { ordersStore } from '$lib/stores/orders.store.svelte';

	interface Props {
		order: OrderResponseDto;
		isExpanded?: boolean;
		onToggle?: () => void;
	}

	let { order, isExpanded = false, onToggle }: Props = $props();

	let speedDialHover = $state(false);
	let isMobile = $state(false);

	// Payment modal state
	let paymentModalOpen = $state(false);
	let paymentClientSecret = $state<string | null>(null);
	let paymentPublishableKey = $state<string | null>(null);

	// Calculate modal state
	let calculateModalOpen = $state(false);

	const speedDialPlacement = $derived(isMobile ? 'bottom' : 'left');
	const tooltipPlacement = $derived(isMobile ? 'left' : 'top');

	onMount(() => {
		const mediaQuery = window.matchMedia('(max-width: 640px)');
		isMobile = mediaQuery.matches;

		const handler = (e: MediaQueryListEvent) => {
			isMobile = e.matches;
		};

		mediaQuery.addEventListener('change', handler);
		return () => mediaQuery.removeEventListener('change', handler);
	});
</script>

<!--
  OrderListItem

  Композиция OrderListItemLayout со slots.
  Использует ActionsSpeedDial для действий.
-->
<OrderListItemLayout class="p-2 pt-4 space-y-4" {isExpanded}>
	{#snippet header()}
		<div class="flex items-center flex-wrap gap-1">
			<h3 class="text-sm font-semibold truncate flex items-center gap-2">
				<OrderBadge {order} class="mr-1" />
				{order.attributes.hostname}
			</h3>
			<OrderStatus status={order.attributes.status} />
		</div>
	{/snippet}

	{#snippet meta()}
		<OrderMeta {order} />
	{/snippet}

	{#snippet actionsTrigger()}
		<!-- Actions Button -->
		<SpeedDialTrigger
			color="light"
			class="p-4! w-6 h-6 border-none rounded-full"
			onmouseenter={() => (speedDialHover = true)}
			onmouseleave={() => (speedDialHover = false)}
		>
			{#snippet icon()}
				<DotsVerticalOutline size="sm" class="transition-transform duration-200 {speedDialHover ? 'scale-120' : ''}" />
			{/snippet}
		</SpeedDialTrigger>
		<SpeedDial
			trigger="hover"
			placement={speedDialPlacement}
			tooltip={tooltipPlacement}
			pill={false}
			transition={fly}
			transitionParams={{ duration: 100 }}
		>
			<ActionsSpeedDial
				{order}
				renderer={ActionSpeedDialButton}
				class="w-9 h-9 shadow-md whitespace-nowrap rounded-full"
				onOpenPaymentModal={async (clientSecret, publishableKey) => {
					paymentClientSecret = clientSecret;
					paymentPublishableKey = publishableKey;
					paymentModalOpen = true;
					await ordersStore.refreshOrder(order.attributes.id);
				}}
				onOpenCalculateModal={() => {
					calculateModalOpen = true;
				}}
			/>
		</SpeedDial>

		<!-- Collapse/Expand Button -->
		<Button color="light" class="p-4 w-6 h-6 border-none rounded-full" onclick={onToggle}>
			<ChevronDownOutline size="md" class="{isExpanded ? 'rotate-180' : ''} transition-transform duration-200" />
		</Button>

		<!-- Open Order Details Page Button -->
		<Button
			color="light"
			class="p-4 w-6 h-6 border-none rounded-full"
			onclick={() => goto(configService.routes.orderById(order.attributes.id))}
		>
			<ArrowUpRightFromSquareOutline size="sm" />
		</Button>
	{/snippet}

	{#snippet expandableContent()}
		<div class="order-stats space-y-2">
			<OrderOutput {order} class="stats-card" />
			<OrderErrors {order} class="stats-card  text-xs space-y-2" />
			<OrderInfo {order} class="stats-card" />
		</div>
	{/snippet}
</OrderListItemLayout>

<!-- Payment Modal - rendered outside SpeedDial -->
{#if paymentModalOpen && paymentClientSecret && paymentPublishableKey}
	<StripeElementsModal
		bind:open={paymentModalOpen}
		clientSecret={paymentClientSecret}
		publishableKey={paymentPublishableKey}
		onSuccess={async () => {
			paymentModalOpen = false;
			await ordersStore.refreshOrder(order.attributes.id);
		}}
		onClose={() => {
			paymentModalOpen = false;
		}}
	/>
{/if}

<!-- Calculate Modal - rendered outside SpeedDial -->
{#if calculateModalOpen}
	<CalculateModal {order} bind:open={calculateModalOpen} />
{/if}

<style>
	@reference "tailwindcss";
	.order-stats :global(.stats-card) {
		@apply p-4 rounded border-none dark:border-none bg-gray-50;
	}
	:global(.dark) .order-stats :global(.stats-card) {
		@apply bg-gray-900;
	}
</style>
