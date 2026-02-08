<script lang="ts">
	import { slide } from 'svelte/transition';
	import {
		Card,
		Alert,
		Accordion,
		AccordionItem,
		Button,
		SpeedDial,
		SpeedDialTrigger,
		Listgroup
	} from 'flowbite-svelte';
	import { ChevronDownOutline, PlusOutline } from 'flowbite-svelte-icons';
	import { formatNumber } from '$lib/utils/number-format';
	import { type OrderResponseDto } from '@api/shared';
	import ErrorList from '$lib/components/general/ErrorList.svelte';
	import ProgressBar from '$lib/components/general/ProgressBar.svelte';
	import OrderStatusBadge from '$lib/components/order/OrderStatusBadge.svelte';
	import OrderActions from '$lib/components/order/OrderActions.svelte';
	import OrderStats from '$lib/components/order/OrderStats.svelte';
	import CalculateAction from '$lib/components/order/actions/CalculateAction.svelte';
	import { getAvailableActionButtons } from '$lib/config/order-actions.config';

	interface Props {
		order: OrderResponseDto;
		isOpen?: boolean;
		onToggle?: () => void;
		onUpdate?: () => void;
	}

	let { order, isOpen = false, onToggle, onUpdate }: Props = $props();

	let speedDialOpen = $state(false);
	let speedDialHover = $state(false);
	let calculateModalOpen = $state(false);

	const availableActions = $derived(getAvailableActionButtons(order._links));

	const handleActionClick = (actionId: string) => {
		if (actionId === 'calculate') {
			calculateModalOpen = true;
		}
		// TODO: Add handlers for other actions
	};

	const handleToggle = () => {
		if (onToggle) {
			onToggle();
		}
	};

	const formattedDate = $derived(order.createdAt ? new Date(order.createdAt).toLocaleString() : '-');

	const metadataItems = $derived.by(() => {
		const items: string[] = [];

		if (order.createdAt) {
			items.push(formattedDate);
		}
		if (order.totalUrls) {
			items.push(`${formatNumber(order.totalUrls)} urls`);
		}
		if (order.currentAiModel) {
			items.push(order.currentAiModel.displayName);
		}
		if (order.priceTotal) {
			items.push(`${order.currencySymbol} ${formatNumber(order.priceTotal)}`);
		}

		return items;
	});
</script>

<Card class="max-w-none p-4">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<!-- Header -->
		<div class="flex-1">
			<!-- Hostname with Status -->
			<div class="flex items-baseline gap-2 mb-2 flex-wrap">
				<h3 class="text-sm font-semibold truncate">
					{order.hostname}
				</h3>
				<OrderStatusBadge status={order.status} />
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="shrink-0 flex gap-2">
			<!-- Expand Details Button -->
			<Button
				size="xs"
				color="light"
				class="rounded-full p-1 w-8 h-8 {isOpen ? 'rotate-180' : ''} transition-transform duration-200"
				onclick={handleToggle}
			>
				<ChevronDownOutline class="w-4 h-4" />
			</Button>

			<!-- Speed Dial Actions -->
			{#if order._links && Object.keys(order._links).length > 1}
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
					<SpeedDial bind:isOpen={speedDialOpen} placement="top-end" tooltip="none">
						<Listgroup class="divide-none space-y-2 bg-transparent border-none" active>
							{#each availableActions as action}
								<Button
									size="xs"
									color={action.color}
									pill
									class="justify-start shadow-md whitespace-nowrap"
									onclick={() => handleActionClick(action.id)}
								>
									<action.icon class="w-5 h-5 me-2" />
									{action.label}
								</Button>
							{/each}
						</Listgroup>
					</SpeedDial>
				</div>
			{/if}
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
	{#if order.errors && order.errors.length > 0}
		<div class="mt-3">
			<Alert color="red" class="text-xs">
				<ErrorList class="text-xs dark:text-black" error={order.errors} />
			</Alert>
		</div>
	{/if}

	<!-- Progress Bar for Active Generations -->
	{#if true}
		<div class="mt-3">
			<ProgressBar label="URLs" current={3} total={44} size="h-1.5" showNumbers={true} />
		</div>
	{/if}

	<!-- Accordion for Details -->
	<Accordion class="mt-3" flush>
		<AccordionItem
			open={isOpen}
			transitionType={slide}
			transitionParams={{ duration: 300 }}
			classes={{
				button: 'hidden',
				content: 'border-b-0 py-0',
				active: 'bg-transparent border-t border-gray-200 dark:border-gray-700 pt-4',
				inactive: 'border-t border-gray-200 dark:border-gray-700 hidden'
			}}
		>
			<div class="pb-2">
				<!-- Actions Section -->
				<OrderActions {order} class="pb-4" />

				<!-- Stats Section -->
				<OrderStats
					{order}
					class="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
				/>
			</div>
		</AccordionItem>
	</Accordion>
</Card>

<!-- Calculate Action Modal -->
{#if order._links?.calculate}
	<CalculateAction {order} bind:open={calculateModalOpen} showButton={false} {onUpdate} />
{/if}
