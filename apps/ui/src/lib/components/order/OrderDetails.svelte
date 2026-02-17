<script lang="ts">
	import { type OrderResponseDto } from '@api/shared';
	import OrderCard from './OrderCard.svelte';
	import OrderActions from './actions/_OrderActions.svelte';
	import OrderStats from './OrderStats.svelte';
	import CalculateModal from './modals/CalculateModal.svelte';
	import StripeElementsModal from './modals/StripeElementsModal.svelte';
	import { ordersStore } from '$lib/stores/orders.store.svelte';

	interface Props {
		order: OrderResponseDto;
	}

	let { order }: Props = $props();

	let calculateModalOpen = $state(false);
	let paymentModalOpen = $state(false);
	let paymentClientSecret = $state<string | null>(null);
	let paymentPublishableKey = $state<string | null>(null);

	const handlePaymentSuccess = async () => {
		paymentModalOpen = false;
		await ordersStore.refreshOrder(order.attributes.id);
	};

	const handlePaymentClose = () => {
		paymentModalOpen = false;
		paymentClientSecret = null;
		paymentPublishableKey = null;
	};
</script>

<OrderCard {order}>
	{#snippet children()}
		<!-- Actions Section -->
		<OrderActions
			{order}
			class="mb-4"
			bind:calculateModalOpen
			bind:paymentModalOpen
			bind:paymentClientSecret
			bind:paymentPublishableKey
		/>

		<!-- Stats Section -->
		<OrderStats
			{order}
			class="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
		/>
	{/snippet}
</OrderCard>

<!-- Calculate Modal -->
{#if calculateModalOpen}
	<CalculateModal {order} bind:open={calculateModalOpen} />
{/if}

<!-- Payment Modal -->
{#if paymentModalOpen && paymentClientSecret && paymentPublishableKey}
	<StripeElementsModal
		clientSecret={paymentClientSecret}
		publishableKey={paymentPublishableKey}
		onSuccess={handlePaymentSuccess}
		onClose={handlePaymentClose}
	/>
{/if}
