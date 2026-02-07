<script lang="ts">
	import { Card, DropdownDivider, Alert, SpeedDial, SpeedDialTrigger, Listgroup, ListgroupItem } from 'flowbite-svelte';
	import { fly } from 'svelte/transition';
	import {
		DotsHorizontalOutline,
		ChartMixedDollarSolid,
		CashSolid,
		FireSolid,
		DownloadSolid,
		InfoCircleSolid,
		TrashBinOutline
	} from 'flowbite-svelte-icons';
	import { formatNumber } from '$lib/utils/number-format';
	import { ordersService } from '$lib/services/orders.service';
	import { configService } from '$lib/services/config.service';
	import { HateoasAction, type OrderResponseDto } from '@api/shared';
	import ErrorList from '$lib/components/general/ErrorList.svelte';
	import ProgressBar from '$lib/components/general/ProgressBar.svelte';
	import OrderStatusBadge from '$lib/components/order/OrderStatusBadge.svelte';

	interface Props {
		order: OrderResponseDto;
	}

	let { order }: Props = $props();

	let fullContent = $state<string | null>(null);

	const formattedDate = $derived(order.createdAt ? new Date(order.createdAt).toLocaleString() : '-');

	const metadataItems = $derived.by(() => {
		const items: string[] = [];

		if (order.currentAiModel) {
			items.push(order.currentAiModel.displayName);
		}
		if (order.createdAt) {
			items.push(formattedDate);
		}
		if (order.totalUrls) {
			items.push(`${formatNumber(order.totalUrls)} urls`);
		}
		if (order.processedUrls) {
			items.push(`${formatNumber(order.processedUrls)} processed`);
		}
		if (order.priceTotal) {
			items.push(`${order.currencySymbol} ${formatNumber(order.priceTotal)}`);
		}

		return items;
	});

	const handleDownload = () => {
		if (!fullContent) return;

		// Extract domain from hostname (e.g., "https://mototechna.cz" -> "mototechna.cz")
		const domain = new URL(order.hostname).hostname;
		const element = document.createElement('a');
		element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(fullContent));
		element.setAttribute('download', `llms-${domain}.txt`);
		element.style.display = 'none';
		document.body.appendChild(element);
		element.click();
		document.body.removeChild(element);
	};
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

		<!-- Action SpeedDial -->
		<div class="shrink-0 relative">
			<SpeedDialTrigger color="dark" class="rounded-full! px-2! py-2!">
				{#snippet icon()}
					<DotsHorizontalOutline class="h-4 w-4" />
				{/snippet}
			</SpeedDialTrigger>
			<SpeedDial
				pill={true}
				transition={fly}
				transitionParams={{ duration: 200 }}
				tooltip="none"
				placement="bottom-end"
			>
				<Listgroup class="divide-none shadow-xl rounded-lg border border-gray-200 dark:border-gray-600" active>
					<!-- View Details -->
					<ListgroupItem href={configService.routes.orderById(order.id)} class="flex gap-3 px-5 py-3">
						<InfoCircleSolid class="h-4 w-4" />
						View Details
					</ListgroupItem>

					<!-- Divider -->
					<DropdownDivider />

					<!-- Calculate -->
					<ListgroupItem
						disabled={!ordersService.hasAction(order, HateoasAction.CALCULATE)}
						onclick={() => console.log('Calculate')}
						class="flex gap-3 px-5 py-3"
					>
						<ChartMixedDollarSolid class="h-4 w-4 text-purple-500" />
						Select Model
					</ListgroupItem>

					<!-- Payment -->
					<ListgroupItem
						disabled={!ordersService.hasAction(order, HateoasAction.CHECKOUT) &&
							!ordersService.hasAction(order, HateoasAction.PAYMENT_INTENT)}
						onclick={() => console.log('Pay')}
						class="flex gap-3 px-5 py-3"
					>
						<CashSolid class="h-4 w-4 text-green-500" />
						Checkout & Pay
					</ListgroupItem>

					<!-- Run -->
					<ListgroupItem
						disabled={!ordersService.hasAction(order, HateoasAction.RUN)}
						onclick={() => console.log('Run')}
						class="flex gap-3 px-5 py-3"
					>
						<FireSolid class="h-4 w-4 text-red-500" />
						Start Processing
					</ListgroupItem>

					<!-- Download -->
					<ListgroupItem
						disabled={!ordersService.hasAction(order, HateoasAction.DOWNLOAD)}
						onclick={handleDownload}
						class="flex gap-3 px-5 py-3"
					>
						<DownloadSolid class="h-4 w-4 text-blue-500" />
						Download Result
					</ListgroupItem>

					<!-- Divider -->
					<DropdownDivider />

					<!-- Delete -->
					<ListgroupItem class="flex gap-3 px-5 py-3 text-red-600 dark:text-red-400">
						<TrashBinOutline class="h-4 w-4" />
						Delete
					</ListgroupItem>
				</Listgroup>
			</SpeedDial>
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
			<ProgressBar current={3} total={44} size="h-1.5" showPercentage={true} showNumbers={true} />
		</div>
	{/if}
</Card>
