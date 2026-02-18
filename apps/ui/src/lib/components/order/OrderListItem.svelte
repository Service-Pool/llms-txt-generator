<script lang="ts">
	import { slide, fly } from 'svelte/transition';
	import { Accordion, AccordionItem, Button, SpeedDial, SpeedDialTrigger } from 'flowbite-svelte';
	import { ChevronDownOutline, DotsVerticalOutline, EditOutline } from 'flowbite-svelte-icons';
	import { goto } from '$app/navigation';
	import { type OrderResponseDto } from '@api/shared';
	import { ordersService } from '$lib/services/orders.service';
	import { configService } from '$lib/services/config.service';
	import OrderCard from './OrderCard.svelte';
	import OrderActions from './actions/_OrderActions.svelte';
	import OrderStats from './OrderStats.svelte';
	import CalculateModal from './modals/CalculateModal.svelte';
	import StripeElementsModal from './modals/StripeElementsModal.svelte';
	import { ordersStore } from '$lib/stores/orders.store.svelte';

	interface Props {
		order: OrderResponseDto;
		isOpen?: boolean;
		onToggle?: () => void;
	}

	let { order, isOpen = false, onToggle }: Props = $props();

	let speedDialHover = $state(false);
	let calculateModalOpen = $state(false);
	let paymentModalOpen = $state(false);
	let paymentClientSecret = $state<string | null>(null);
	let paymentPublishableKey = $state<string | null>(null);
	let actionInProgress = $state<string | null>(null);
	let isMobile = $state(false);

	const hasAvailableActions = $derived(ordersService.getEnabledActions(order).length > 0);
	const speedDialPlacement = $derived(isMobile ? 'bottom' : 'left');
	const tooltipPlacement = $derived(isMobile ? 'left' : 'top');

	$effect(() => {
		const mediaQuery = window.matchMedia('(max-width: 768px)');
		isMobile = mediaQuery.matches;

		const handler = (e: MediaQueryListEvent) => {
			isMobile = e.matches;
		};

		mediaQuery.addEventListener('change', handler);
		return () => mediaQuery.removeEventListener('change', handler);
	});

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
</script>

<OrderCard {order}>
	{#snippet headerActions()}
		<!-- Speed Dial Actions -->
		{#if hasAvailableActions}
			<div class="relative">
				<SpeedDialTrigger
					color="light"
					class="p-1 w-8 h-8"
					onmouseenter={() => (speedDialHover = true)}
					onmouseleave={() => (speedDialHover = false)}
				>
					{#snippet icon()}
						<DotsVerticalOutline
							size="sm"
							class="transition-transform duration-200 {speedDialHover ? 'scale-120' : ''}"
						/>
					{/snippet}
				</SpeedDialTrigger>
				<SpeedDial
					trigger="click"
					placement={speedDialPlacement}
					tooltip={tooltipPlacement}
					pill={false}
					transition={fly}
					transitionParams={{ duration: 100 }}
				>
					<OrderActions
						{order}
						mode="spd-button"
						loadingAction={actionInProgress}
						bind:calculateModalOpen
						bind:paymentModalOpen
						bind:paymentClientSecret
						bind:paymentPublishableKey
					/>
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
			<ChevronDownOutline size="sm" />
		</Button>

		<!-- Open order Button -->
		<Button
			size="xs"
			color="light"
			class="rounded-full p-1 w-8 h-8"
			onclick={() => goto(configService.routes.orderById(order.attributes.id))}
		>
			<EditOutline size="sm" />
		</Button>
	{/snippet}

	{#snippet children()}
		<!-- Accordion for Details -->
		<Accordion flush>
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

					<!-- Stats Section -->
					<OrderStats
						{order}
						class="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
					/>
				</div>
			</AccordionItem>
		</Accordion>
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
