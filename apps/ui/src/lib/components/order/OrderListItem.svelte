<script lang="ts">
	import { slide, fly } from 'svelte/transition';
	import {
		Card,
		Alert,
		Badge,
		Accordion,
		AccordionItem,
		Button,
		SpeedDial,
		SpeedDialTrigger,
		Listgroup
	} from 'flowbite-svelte';
	import { ChevronDownOutline, PlusOutline, InfoCircleOutline } from 'flowbite-svelte-icons';
	import { formatNumber } from '$lib/utils/number-format';
	import { type OrderResponseDto } from '@api/shared';
	import { ordersService } from '$lib/services/orders.service';
	import ErrorList from '$lib/components/general/ErrorList.svelte';
	import ProgressBar from '$lib/components/general/ProgressBar.svelte';
	import OrderStatusBadge from '$lib/components/order/OrderStatusBadge.svelte';
	import OrderActions from '$lib/components/order/OrderActions.svelte';
	import OrderStats from '$lib/components/order/OrderStats.svelte';
	import CalculateModal from '$lib/components/order/modals/CalculateModal.svelte';
	import StripeElementsModal from '$lib/components/order/modals/StripeElementsModal.svelte';
	import { ordersStore } from '$lib/stores/orders.store.svelte';
	import { OrderStatus } from '@api/shared';

	interface Props {
		order: OrderResponseDto;
		isOpen?: boolean;
		anyOrderOpen?: boolean;
		onToggle?: () => void;
	}

	let { order, isOpen = false, anyOrderOpen = false, onToggle }: Props = $props();

	const cardOpacity = $derived(anyOrderOpen ? (isOpen ? 'opacity-100' : 'opacity-60') : null);
	const cardShadow = $derived(anyOrderOpen ? (isOpen ? 'shadow-md' : 'shadow-none') : null);

	let speedDialOpen = $state(false);
	let speedDialHover = $state(false);
	let calculateModalOpen = $state(false);
	let paymentModalOpen = $state(false);
	let paymentClientSecret = $state<string | null>(null);
	let paymentPublishableKey = $state<string | null>(null);
	let actionInProgress = $state<string | null>(null);

	const hasAvailableActions = $derived(ordersService.getEnabledActions(order).length > 0);

	const handlePaymentSuccess = async () => {
		paymentModalOpen = false;
		await ordersStore.refreshOrder(order.attributes.id);
	};

	const handlePaymentClose = () => {
		paymentModalOpen = false;
		paymentClientSecret = null;
		paymentPublishableKey = null;
	};

	const handleToggle = () => {
		if (onToggle) {
			onToggle();
		}
	};

	const formattedDate = $derived(order.attributes.createdAt ? new Date(order.attributes.createdAt).toLocaleString() : '-');

	const metadataItems = $derived.by(() => {
		const items: string[] = [];

		if (order.attributes.createdAt) {
			items.push(formattedDate);
		}
		if (order.attributes.totalUrls) {
			items.push(`${formatNumber(order.attributes.totalUrls)} urls`);
		}
		if (order.attributes.currentAiModel) {
			items.push(order.attributes.currentAiModel.displayName);
		}
		if (order.attributes.priceTotal) {
			items.push(`${order.attributes.currencySymbol} ${formatNumber(order.attributes.priceTotal)}`);
		}

		return items;
	});
</script>

<Card class="max-w-none p-4 transition-opacity-shadow duration-100 {cardOpacity} {cardShadow}">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<!-- Header -->
		<div class="flex-1">
			<!-- Hostname with Status -->
			<div class="flex items-baseline gap-2 mb-2 flex-wrap">
				<h3 class="text-sm font-semibold truncate">
					<Badge color="gray" class="px-2 mr-1">#{order.attributes.id}</Badge>{order.attributes.hostname}
				</h3>
				<OrderStatusBadge status={order.attributes.status} />
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="shrink-0 flex gap-2">
			<!-- Speed Dial Actions -->
			{#if hasAvailableActions}
				<div class="relative">
					<SpeedDialTrigger
						color="dark"
						class="rounded-full p-1 w-8 h-8 dark:bg-white dark:text-gray-900"
						onmouseenter={() => (speedDialHover = true)}
						onmouseleave={() => (speedDialHover = false)}
					>
						{#snippet icon()}
							<PlusOutline
								class="w-4 h-4 transition-transform duration-200 {speedDialOpen || speedDialHover ? 'rotate-45' : ''}"
							/>
						{/snippet}
					</SpeedDialTrigger>
					<SpeedDial
						trigger="click"
						placement="top-end"
						tooltip="none"
						transition={fly}
						transitionParams={{ duration: 100 }}
					>
						<Listgroup class="divide-none space-y-2 bg-transparent border-none flex flex-col" active={false}>
							<OrderActions
								{order}
								mode="button"
								loadingAction={actionInProgress}
								bind:calculateModalOpen
								bind:paymentModalOpen
								bind:paymentClientSecret
								bind:paymentPublishableKey
							/>
						</Listgroup>
					</SpeedDial>
				</div>
			{/if}

			<!-- Expand Card Button -->
			<Button
				size="xs"
				color="light"
				class="rounded-full p-1 w-8 h-8 {isOpen ? 'rotate-180' : ''} transition-transform duration-200"
				onclick={handleToggle}
			>
				<ChevronDownOutline class="w-4 h-4" />
			</Button>
		</div>
	</div>

	<!-- Provider & Metadata in one line -->
	<div class="flex flex-wrap items-center gap-2 whitespace-nowrap capitalize text-xs opacity-75">
		{#each metadataItems as item, i}
			<span>{item}</span>
			{#if i < metadataItems.length - 1}
				<span>•</span>
			{/if}
		{/each}
	</div>

	<!-- Errors -->
	{#if order.attributes.errors && order.attributes.errors.length > 0}
		<div class="mt-3">
			<Alert color="red" class="text-xs">
				<ErrorList class="text-xs dark:text-black" error={order.attributes.errors} />
			</Alert>
		</div>
	{/if}

	<!-- Progress Bar for Active Generations -->
	{#if order.attributes.status === OrderStatus.PROCESSING}
		<div class="mt-3">
			<ProgressBar
				label="URLs"
				current={order.attributes.processedUrls}
				total={order.attributes.totalUrls!}
				size="h-1.5"
				showNumbers={true}
			/>
		</div>
	{/if}

	<!-- Accordion for Details -->
	<Accordion class="mt-3" flush>
		<AccordionItem
			open={isOpen}
			transitionType={slide}
			transitionParams={{ duration: 100 }}
			classes={{
				button: 'hidden',
				content: 'border-b-0 py-0',
				active: 'bg-transparent border-t border-gray-200 dark:border-gray-700 pt-4',
				inactive: 'border-t border-gray-200 dark:border-gray-700 hidden'
			}}
		>
			<div class="pb-2">
				<!-- Actions Section -->
				<OrderActions
					{order}
					class="pb-4"
					bind:calculateModalOpen
					bind:paymentModalOpen
					bind:paymentClientSecret
					bind:paymentPublishableKey
				/>

				<!-- Divider with Info Icon -->
				<div class="flex items-center gap-3 mb-4">
					<div class="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
					<InfoCircleOutline class="w-6 h-6 text-gray-400 dark:text-gray-500" />
					<div class="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
				</div>

				<!-- Stats Section -->
				<OrderStats
					{order}
					class="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
				/>
			</div>
		</AccordionItem>
	</Accordion>
</Card>

<!-- Calculate Modal (rendered outside SpeedDial to prevent unmounting) -->
{#if calculateModalOpen}
	<CalculateModal {order} bind:open={calculateModalOpen} />
{/if}

<!-- Payment Modal (rendered outside SpeedDial to prevent unmounting) -->
{#if paymentModalOpen && paymentClientSecret && paymentPublishableKey}
	<StripeElementsModal
		clientSecret={paymentClientSecret}
		publishableKey={paymentPublishableKey}
		onSuccess={handlePaymentSuccess}
		onClose={handlePaymentClose}
	/>
{/if}
