<script lang="ts">
	import { OrderStatus, type OrderResponseDto } from "@api/shared";
	import { Card, Badge, Button, Alert, P } from "flowbite-svelte";
	import { formatNumber } from "$lib/utils/number-format";
	import ProgressBar from "$lib/components/ProgressBar.svelte";
	import Spinner from "$lib/components/Spinner.svelte";
	import ErrorList from "$lib/components/ErrorList.svelte";

	interface Props {
		order: OrderResponseDto;
	}

	let { order }: Props = $props();

	const statusConfig = $derived.by(() => {
		switch (order.status) {
			case OrderStatus.CREATED:
				return { text: "Created", color: "blue" as const };
			case OrderStatus.CALCULATED:
				return { text: "Calculated", color: "indigo" as const };
			case OrderStatus.PENDING_PAYMENT:
				return { text: "Pending Payment", color: "yellow" as const };
			case OrderStatus.PAID:
				return { text: "Paid", color: "green" as const };
			case OrderStatus.QUEUED:
				return { text: "Queued", color: "purple" as const };
			case OrderStatus.PROCESSING:
				return { text: "Processing", color: "purple" as const };
			case OrderStatus.COMPLETED:
				return { text: "Completed", color: "green" as const };
			case OrderStatus.FAILED:
				return { text: "Failed", color: "red" as const };
			case OrderStatus.PAYMENT_FAILED:
				return { text: "Payment Failed", color: "red" as const };
			case OrderStatus.REFUNDED:
				return { text: "Refunded", color: "gray" as const };
			default:
				return { text: order.status, color: undefined };
		}
	});

	const ACTION_BTN_MIN_WIDTH = "5rem";

	const formattedDate = $derived(
		order.createdAt ? new Date(order.createdAt).toLocaleString() : "-",
	);

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
			items.push(
				`${order.currencySymbol} ${formatNumber(order.priceTotal)}`,
			);
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
				<Badge color={statusConfig.color}>{statusConfig.text}</Badge>
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="shrink-0 grid grid-flow-col auto-cols-fr gap-1">
			<Button
				href={""}
				color="orange"
				size="xs"
				class="border-0"
				style="min-width: {ACTION_BTN_MIN_WIDTH}">
				Pay
			</Button>

			<Button
				outline
				color="blue"
				size="xs"
				class="border-2"
				style="min-width: {ACTION_BTN_MIN_WIDTH}">
				{"Hide/Show"}
			</Button>

			<Button
				color="red"
				outline
				size="xs"
				class="border-2"
				style="min-width: {ACTION_BTN_MIN_WIDTH}">
				Delete
			</Button>
		</div>
	</div>

	<!-- Provider & Metadata in one line -->
	<div
		class="flex flex-wrap items-center gap-2 whitespace-nowrap capitalize text-xs opacity-75">
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
				<ErrorList
					class="text-xs dark:text-black"
					error={order.errors} />
			</Alert>
		</div>
	{/if}

	<!-- Progress Bar for Active Generations -->
	{#if true}
		<div class="mt-3">
			<ProgressBar
				current={3}
				total={44}
				size="h-1.5"
				showPercentage={true}
				showNumbers={true} />
		</div>
	{/if}

	<!-- Content Section -->
	{#if true}
		<div
			class="mt-2 p-2 max-h-96 overflow-y-auto overflow-x-hidden rounded border bg-gray-50 dark:bg-gray-600 border-gray-200 dark:border-gray-700">
			{#if false}
				<div class="flex justify-center items-center py-6">
					<Spinner size="8" delay={1000} />
				</div>
			{:else}
				<P
					class="text-xs leading-relaxed whitespace-pre-wrap wrap-break-word word-break overflow-hidden">
					{order.output}
				</P>
			{/if}
		</div>
	{/if}

	<!-- Action Buttons for Content -->
	{#if order.output && order.status === OrderStatus.COMPLETED}
		<div class="flex gap-1 justify-end mt-2">
			<Button outline color="blue" size="xs" class="border-2"
				>Copy</Button>
			<Button outline color="green" size="xs" class="border-2"
				>Download</Button>
		</div>
	{/if}
</Card>
