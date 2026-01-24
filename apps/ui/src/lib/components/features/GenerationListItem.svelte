<script lang="ts">
	import {
		GenerationStatus,
		GenerationRequestStatus,
		type GenerationRequestDtoResponse,
		ResponseCode,
	} from "@api/shared";
	import { configService } from "$lib/api/config.service";
	import { formatNumber } from "$lib/utils/number-format";
	import { generationsService } from "$lib/api/generations.service";
	import { HttpClientError } from "$lib/api/http.client";
	import ProgressBar from "../common/ProgressBar.svelte";
	import Spinner from "../common/Spinner.svelte";
	import StripeElementsModal from "../common/StripeElementsModal.svelte";
	import { Card, Badge, Button, Alert, P } from "flowbite-svelte";

	const ACTION_BTN_MIN_WIDTH = "5rem";

	interface Props {
		item: GenerationRequestDtoResponse;
		progress?: { processedUrls: number; totalUrls: number } | null;
		onDelete: (id: number) => void;
		onPaymentSuccess?: (id: number) => void;
	}

	let { item, progress = null, onDelete, onPaymentSuccess }: Props = $props();

	let showContent = $state(false);
	let fullContent = $state<string | null>(null);
	let isLoading = $state(false);
	let paymentData = $state<
		| {
				method: "checkout";
				url: string;
		  }
		| {
				method: "elements";
				publishableKey: string;
				clientSecret: string;
		  }
		| null
	>(null);
	let paymentLinkLoaded = $state(false);
	let showPaymentModal = $state(false);
	let errors = $state<string[] | null>(null);
	let isRefunding = $state(false);
	const isReady = $derived(
		item.status !== GenerationRequestStatus.PENDING_PAYMENT.value ||
			paymentLinkLoaded,
	);

	const loadPaymentData = async () => {
		const paymentMethod = configService.stripe.paymentMethod;
		errors = null;

		try {
			switch (paymentMethod) {
				case "elements": {
					// Payment Intent for Elements
					const response = await generationsService.getPaymentIntent(
						item.id,
					);
					const data = response.getMessage().data;
					paymentData = {
						method: "elements",
						publishableKey: data.publishableKey,
						clientSecret: data.clientSecret,
					};
					break;
				}

				case "checkout": {
					// Payment Link for Checkout
					const response = await generationsService.getPaymentLink(
						item.id,
					);
					const data = response.getMessage().data;
					paymentData = {
						method: "checkout",
						url: data.paymentLink,
					};
					break;
				}
			}
		} catch (err) {
			if (
				err instanceof HttpClientError &&
				err.code === ResponseCode.INVALID
			) {
				errors = err.violations;
			}

			throw err;
		} finally {
			paymentLinkLoaded = true;
		}
	};

	// Load payment data based on configured method
	$effect(() => {
		if (
			item.status === GenerationRequestStatus.PENDING_PAYMENT.value &&
			!paymentData
		) {
			loadPaymentData();
		}
	});

	const status = $derived.by(() => {
		return item.generation.status;
	});

	const statusConfig = $derived.by(() => {
		switch (status) {
			case GenerationStatus.WAITING:
				return { text: "Waiting", color: "yellow" as const };
			case GenerationStatus.ACTIVE:
				return { text: "Processing", color: "blue" as const };
			case GenerationStatus.COMPLETED:
				return { text: "Completed", color: "green" as const };
			case GenerationStatus.FAILED:
				return { text: "Failed", color: "red" as const };
			default:
				return { text: "Unknown", color: undefined };
		}
	});

	const requestStatusConfig = $derived.by(() => {
		switch (item.status) {
			case GenerationRequestStatus.PENDING_PAYMENT.value:
				return {
					text: GenerationRequestStatus.PENDING_PAYMENT.label,
					class: "",
				};
			case GenerationRequestStatus.ACCEPTED.value:
				return {
					text: GenerationRequestStatus.ACCEPTED.label,
					class: "",
				};
			case GenerationRequestStatus.REFUNDED.value:
				return {
					text: GenerationRequestStatus.REFUNDED.label,
					class: "",
				};
			default:
				return {
					text: "Unknown",
					class: "",
				};
		}
	});

	const formattedDate = $derived(
		item.createdAt ? new Date(item.createdAt).toLocaleString() : "-",
	);

	const handleDelete = (e: MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		if (confirm(`Delete generation for ${item.generation.hostname}?`)) {
			onDelete(item.id);
		}
	};

	const handleShowContent = async () => {
		if (fullContent) {
			showContent = !showContent;
			return;
		}

		isLoading = true;
		try {
			const response = await generationsService.findById(
				item.generation.id,
			);
			fullContent = response.getMessage().data.output;
			showContent = true;
		} catch (err) {
			throw err;
		} finally {
			isLoading = false;
		}
	};

	const handleCopy = async () => {
		if (!fullContent) return;

		await navigator.clipboard.writeText(fullContent);
		alert("Content copied to clipboard");
	};

	const handleDownload = () => {
		if (!fullContent) return;
		// Extract domain from hostname (e.g., "https://mototechna.cz" -> "mototechna.cz")
		const domain = new URL(item.generation.hostname).hostname;
		const element = document.createElement("a");
		element.setAttribute(
			"href",
			"data:text/plain;charset=utf-8," + encodeURIComponent(fullContent),
		);
		element.setAttribute("download", `llms-${domain}.txt`);
		element.style.display = "none";
		document.body.appendChild(element);
		element.click();
		document.body.removeChild(element);
	};

	const handleOpenPaymentModal = () => {
		showPaymentModal = true;
	};

	const handlePaymentSuccess = () => {
		if (onPaymentSuccess) {
			onPaymentSuccess(item.id);
		}
		showPaymentModal = false;
	};

	const handleClosePaymentModal = () => {
		showPaymentModal = false;
	};

	const handleRefund = async () => {
		if (!confirm("Request refund for this failed generation?")) {
			return;
		}

		isRefunding = true;
		errors = null;

		try {
			const response = await generationsService.refund(item.id);
			const refundData = response.getMessage().data;
			alert(
				`Refund processed successfully!\n\nRefund ID: ${refundData.refundId}\nAmount: ${refundData.amount} ${refundData.currency}\nStatus: ${refundData.status}\n\nSave this information for your bank if needed.`,
			);

			// Refresh item to update status
			if (onPaymentSuccess) {
				onPaymentSuccess(item.id);
			}
		} catch (err) {
			if (
				err instanceof HttpClientError &&
				err.code === ResponseCode.INVALID
			) {
				errors = err.violations;
			} else {
				alert("Failed to process refund. Please try again.");
			}
		} finally {
			isRefunding = false;
		}
	};
</script>

{#if !isReady}
	<Card class="max-w-none p-4 shadow-sm">
		<div class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
		<div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
	</Card>
{:else}
	<Card class="max-w-none p-4 shadow-sm">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="flex-1">
				<!-- Hostname with Status -->
				<div class="flex items-baseline gap-2 mb-2 flex-wrap">
					<h3 class="text-sm font-semibold truncate">
						{item.generation.hostname}
					</h3>
					<Badge color={statusConfig.color}
						>{statusConfig.text}</Badge>
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="shrink-0 grid grid-flow-col auto-cols-fr gap-1">
				{#if item.status === GenerationRequestStatus.PENDING_PAYMENT.value && paymentData}
					{#if paymentData.method === "checkout" && paymentData.url}
						<Button
							href={paymentData.url}
							color="orange"
							size="xs"
							class="border-2"
							style="min-width: {ACTION_BTN_MIN_WIDTH}"
							>Pay</Button>
					{:else if paymentData.method === "elements" && paymentData.clientSecret}
						<Button
							onclick={handleOpenPaymentModal}
							outline
							color="orange"
							size="xs"
							class="border-2"
							style="min-width: {ACTION_BTN_MIN_WIDTH}"
							>Pay</Button>
					{/if}
				{/if}

				{#if status === GenerationStatus.COMPLETED}
					<Button
						onclick={handleShowContent}
						outline
						color="blue"
						size="xs"
						class="border-2"
						style="min-width: {ACTION_BTN_MIN_WIDTH}">
						{showContent ? "Hide" : "Show"}
					</Button>
				{/if}
				{#if item.refundable}
					<Button
						onclick={handleRefund}
						disabled={isRefunding}
						outline
						color="purple"
						size="xs"
						class="border-2"
						style="min-width: {ACTION_BTN_MIN_WIDTH}">
						{isRefunding ? "Processing..." : "Refund"}
					</Button>
				{/if}
				<Button
					onclick={handleDelete}
					color="red"
					outline
					size="xs"
					class="border-2"
					style="min-width: {ACTION_BTN_MIN_WIDTH}">
					Delete</Button>
			</div>
		</div>

		<!-- Provider & Metadata in one line -->
		<div
			class="flex flex-wrap items-center gap-2 whitespace-nowrap capitalize text-xs opacity-75">
			<span>{item.generation.provider}</span>
			<span>•</span>
			<span>{formattedDate}</span>
			{#if item.generation.urlsCount}
				<span>•</span>
				<span>{formatNumber(item.generation.urlsCount)} urls</span>
			{/if}
			{#if requestStatusConfig}
				<span>•</span>
				<span class={requestStatusConfig.class}>
					{requestStatusConfig.text}
				</span>
			{/if}
		</div>

		<!-- Error Messages -->
		{#if errors || (status === GenerationStatus.FAILED && item.generation.errors)}
			<div class="mt-3">
				<Alert color="red" class="text-xs">
					<ul class="list-disc list-inside space-y-1">
						{#if errors}
							{#each errors as errMsg}
								<li>{errMsg}</li>
							{/each}
						{/if}
						{#if status === GenerationStatus.FAILED && item.generation.errors}
							<li>Error: {item.generation.errors}</li>
						{/if}
					</ul>
				</Alert>
			</div>
		{/if}

		<!-- Progress Bar for Active Generations -->
		{#if status === GenerationStatus.ACTIVE && progress}
			<div class="mt-3">
				<ProgressBar
					current={progress.processedUrls}
					total={progress.totalUrls}
					size="h-1.5"
					showPercentage={true}
					showNumbers={true} />
			</div>
		{/if}

		<!-- Content Section -->
		{#if showContent || isLoading}
			<div
				class="mt-2 p-2 max-h-96 overflow-y-auto overflow-x-hidden rounded border bg-gray-50 dark:bg-gray-600 border-gray-200 dark:border-gray-700">
				{#if isLoading}
					<div class="flex justify-center items-center py-6">
						<Spinner size="8" delay={1000} />
					</div>
				{:else}
					<P
						class="text-xs leading-relaxed whitespace-pre-wrap wrap-break-word word-break overflow-hidden">
						{fullContent}
					</P>
				{/if}
			</div>
		{/if}

		<!-- Action Buttons for Content -->
		{#if showContent && fullContent && !isLoading}
			<div class="flex gap-1 justify-end mt-2">
				<Button
					onclick={handleCopy}
					outline
					color="blue"
					size="xs"
					class="border-2">Copy</Button>
				<Button
					onclick={handleDownload}
					outline
					color="green"
					size="xs"
					class="border-2">Download</Button>
			</div>
		{/if}
	</Card>
{/if}

<!-- Stripe Elements Payment Modal -->
{#if showPaymentModal && paymentData?.method === "elements" && paymentData.clientSecret}
	<StripeElementsModal
		clientSecret={paymentData.clientSecret}
		publishableKey={paymentData.publishableKey}
		onSuccess={handlePaymentSuccess}
		onClose={handleClosePaymentModal} />
{/if}
