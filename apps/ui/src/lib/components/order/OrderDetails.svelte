<script lang="ts">
	import { type OrderResponseDto } from '@api/shared';
	import { ordersService } from '$lib/services/orders.service';
	import OrderCard from './OrderCard.svelte';
	import OrderActions from './actions/_OrderActions.svelte';
	import DeleteAction from './actions/DeleteAction.svelte';
	import OrderStats from './OrderStats.svelte';
	import CalculateModal from './modals/CalculateModal.svelte';
	import StripeElementsModal from './modals/StripeElementsModal.svelte';
	import { ordersStore } from '$lib/stores/orders.store.svelte';

	interface Props {
		order: OrderResponseDto;
	}

	let { order }: Props = $props();

	const enabledActions = $derived(ordersService.getEnabledActions(order));
	const canDelete = $derived(enabledActions.some((a) => a.id === 'delete'));

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

<OrderCard {order} showEditLink={false}>
	{#snippet headerActions()}
		<DeleteAction {order} mode="stepper" disabled={!canDelete} />
	{/snippet}
	{#snippet children()}
		<!-- Actions Stepper -->
		<OrderActions
			{order}
			mode="stepper"
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
