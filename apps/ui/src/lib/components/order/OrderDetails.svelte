<script lang="ts">
	import type { OrderResponseDto } from '@api/shared';
	import { OrderStatus } from '@api/shared';
	import {
		OrderDetailsLayout,
		OrderBadge,
		OrderStatus as OrderStatusComponent,
		OrderMeta,
		OrderOutput,
		OrderErrors,
		OrderInfo,
		OrderStepper,
		ActionButton,
		DeleteAction,
		StripeElementsModal,
		CalculateModal
	} from '$lib/components/order';
	import { OrderStateMachine, StepActionIdEnum } from '$lib/domain/order';
	import { getActionConfig } from '$lib/components/order-actions.config';
	import ProgressBar from '$lib/components/ui/progress-bar.svelte';
	import { Heading } from 'flowbite-svelte';
	import { ordersStore } from '$lib/stores/orders.store.svelte';

	interface Props {
		order: OrderResponseDto;
	}

	let { order }: Props = $props();

	// Get available transitions
	const transitions = $derived(OrderStateMachine.getAvailableTransitions(order));
	const deleteTransition = $derived(transitions.find((t) => t.id === StepActionIdEnum.Delete));
	const deleteConfig = $derived(getActionConfig(StepActionIdEnum.Delete));

	// Payment modal state
	let paymentModalOpen = $state(false);
	let paymentClientSecret = $state<string | null>(null);
	let paymentPublishableKey = $state<string | null>(null);

	// Calculate modal state
	let calculateModalOpen = $state(false);
</script>

<!-- OrderDetails Композиция для детальной страницы заказа. -->
<OrderDetailsLayout>
	{#snippet header()}
		<Heading tag="h2" class="text-xl flex flex-wrap items-center gap-2">
			<OrderBadge {order} class="text-base" />
			{order.attributes.hostname}
			<OrderStatusComponent status={order.attributes.status} />
		</Heading>
	{/snippet}

	{#snippet meta()}
		<OrderMeta {order} />
	{/snippet}

	{#snippet stepper()}
		<OrderStepper
			{order}
			class="rounded border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 bg-[linear-gradient(rgba(255,255,255,0.9),rgba(255,255,255,0.9)),url('/pattern.svg')] dark:bg-[linear-gradient(rgba(16,24,40,0.6),rgba(16,24,40,0.6)),url('/pattern.svg')] bg-contain bg-repeat"
			renderer={ActionButton}
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
	{/snippet}

	{#snippet progress()}
		{#if order.attributes.status === OrderStatus.PROCESSING}
			<ProgressBar
				label="URLs"
				current={order.attributes.processedUrls}
				total={order.attributes.totalUrls!}
				size="h-1.5"
				showNumbers={true}
			/>
		{/if}
	{/snippet}

	{#snippet stats()}
		<div class="order-stats space-y-2">
			<OrderOutput {order} class="stats-card" />
			<OrderErrors {order} class="text-xs stats-card" />
			<OrderInfo {order} class="stats-card" />
		</div>
	{/snippet}

	{#snippet footer()}
		<div class="flex justify-end">
			<DeleteAction
				{order}
				transition={(deleteTransition || deleteConfig)!}
				renderer={ActionButton}
				disabled={!deleteTransition}
			/>
		</div>
	{/snippet}
</OrderDetailsLayout>

<!-- Payment Modal -->
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

<!-- Calculate Modal -->
{#if calculateModalOpen}
	<CalculateModal {order} bind:open={calculateModalOpen} />
{/if}

<style>
	@reference "tailwindcss";
	.order-stats :global(.stats-card) {
		@apply p-4 rounded border border-gray-200 bg-white;
	}
	:global(.dark) .order-stats :global(.stats-card) {
		@apply border-gray-800 bg-gray-800;
	}
</style>
