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
				return {
					text: "Waiting",
					class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
				};
			case GenerationStatus.ACTIVE:
				return {
					text: "Processing",
					class: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
				};
			case GenerationStatus.COMPLETED:
				return {
					text: "Completed",
					class: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
				};
			case GenerationStatus.FAILED:
				return {
					text: "Failed",
					class: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
				};
			default:
				return {
					text: "Unknown",
					class: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
				};
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
					class: "text-purple-600 dark:text-purple-400",
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
	<div
		class="p-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 animate-pulse">
		<div class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
		<div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
	</div>
{:else}
	<div
		class="p-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="flex-1">
				<!-- Hostname with Status -->
				<div class="flex items-baseline gap-2 mb-2 flex-wrap">
					<h3
						class="text-sm font-semibold text-gray-900 dark:text-white truncate">
						{item.generation.hostname}
					</h3>
					<span
						class="px-2 py-0.5 rounded text-xs font-medium {statusConfig.class}">
						{statusConfig.text}
					</span>
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="shrink-0 grid grid-flow-col auto-cols-fr gap-1 w-fit items-center">
				{#if item.status === GenerationRequestStatus.PENDING_PAYMENT.value && paymentData}
					{#if paymentData.method === "checkout" && paymentData.url}
						<a
							href={paymentData.url}
							class="px-2 py-1 text-xs bg-orange-100 hover:bg-orange-200 dark:bg-orange-900 dark:hover:bg-orange-800 text-orange-700 dark:text-orange-200 rounded transition-colors">
							Pay Now
						</a>
					{:else if paymentData.method === "elements" && paymentData.clientSecret}
						<button
							onclick={handleOpenPaymentModal}
							class="px-2 py-1 text-xs bg-orange-100 hover:bg-orange-200 dark:bg-orange-900 dark:hover:bg-orange-800 text-orange-700 dark:text-orange-200 rounded transition-colors">
							Pay Now
						</button>
					{/if}
				{/if}

				{#if status === GenerationStatus.COMPLETED}
					<button
						onclick={handleShowContent}
						disabled={false}
						class="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
						<span>{showContent ? "Hide" : "Show"}</span>
					</button>
				{/if}
				{#if item.refundable}
					<button
						onclick={handleRefund}
						disabled={isRefunding}
						class="px-2 py-1 text-xs bg-purple-100 hover:bg-purple-200 dark:bg-purple-900 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
						{isRefunding ? "Processing..." : "Refund"}
					</button>
				{/if}
				<button
					onclick={handleDelete}
					class="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-200 rounded transition-colors"
					aria-label="Delete generation">
					Delete
				</button>
			</div>
		</div>

		<!-- Provider & Metadata in one line -->
		<div
			class="w-full flex flex-wrap items-center gap-2 whitespace-nowrap capitalize text-xs text-gray-500 dark:text-gray-400">
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
			<div
				class="mt-3 pt-2 dark:bg-red-900/20 border-t border-t-red-200 dark:border-t-red-800">
				<ul
					class="list-disc list-inside text-xs text-red-800 dark:text-red-200 space-y-1">
					{#if errors}
						{#each errors as errMsg}
							<li>{errMsg}</li>
						{/each}
					{/if}
					{#if status === GenerationStatus.FAILED && item.generation.errors}
						<li>Error: {item.generation.errors}</li>
					{/if}
				</ul>
			</div>
		{/if}

		<!-- Progress Bar for Active Generations -->
		{#if status === GenerationStatus.ACTIVE && progress}
			<div class="mt-3">
				<ProgressBar
					current={progress.processedUrls}
					total={progress.totalUrls}
					size="sm"
					showPercentage={true}
					showNumbers={true} />
			</div>
		{/if}

		<!-- Content Section -->
		{#if showContent || isLoading}
			<div
				class="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 max-h-96 overflow-y-auto overflow-x-hidden">
				{#if isLoading}
					<div class="flex justify-center items-center py-6">
						<Spinner
							size="md"
							color="var(--spinner-color)"
							delay={1000} />
					</div>
				{:else}
					<p
						class="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap wrap-break-word word-break overflow-hidden">
						{fullContent}
					</p>
				{/if}
			</div>
		{/if}

		<!-- Action Buttons for Content -->
		{#if showContent && fullContent && !isLoading}
			<div class="flex gap-1 justify-end mt-2">
				<button
					onclick={handleCopy}
					class="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-200 rounded transition-colors">
					Copy
				</button>
				<button
					onclick={handleDownload}
					class="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-700 dark:text-green-200 rounded transition-colors">
					Download
				</button>
			</div>
		{/if}
	</div>
{/if}

<!-- Stripe Elements Payment Modal -->
{#if showPaymentModal && paymentData?.method === "elements" && paymentData.clientSecret}
	<StripeElementsModal
		clientSecret={paymentData.clientSecret}
		publishableKey={paymentData.publishableKey}
		onSuccess={handlePaymentSuccess}
		onClose={handleClosePaymentModal} />
{/if}
