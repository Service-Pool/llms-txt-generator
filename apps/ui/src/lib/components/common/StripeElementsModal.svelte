<script lang="ts">
	import {
		loadStripe,
		type Stripe,
		type StripeElements,
	} from "@stripe/stripe-js";
	import { onMount, tick } from "svelte";

	interface Props {
		clientSecret: string;
		publishableKey: string;
		onSuccess: () => void;
		onClose: () => void;
	}

	let { clientSecret, publishableKey, onSuccess, onClose }: Props = $props();

	let stripe: Stripe | null = $state(null);
	let elements: StripeElements | null = $state(null);
	let isLoading = $state(true);
	let isProcessing = $state(false);
	let paymentElementContainer: HTMLDivElement | undefined = $state(undefined);
	let paymentElement: any = null;

	onMount(async () => {
		stripe = await loadStripe(publishableKey);

		if (!stripe) {
			throw new Error("Failed to load Stripe");
		}

		elements = stripe.elements({ clientSecret });
		isLoading = false;

		// Ждем обновления DOM чтобы контейнер был готов
		await tick();

		if (paymentElementContainer) {
			paymentElement = elements.create("payment");
			paymentElement.mount(paymentElementContainer);
		}
	});

	const handleSubmit = async (e: Event) => {
		e.preventDefault();

		if (!stripe || !elements) {
			return;
		}

		isProcessing = true;

		const { error } = await stripe.confirmPayment({
			elements,
			confirmParams: {
				return_url: window.location.origin + "/generations",
			},
			redirect: "if_required",
		});

		if (error) {
			isProcessing = false;
			throw new Error(error.message || "Payment failed");
		}

		// Payment succeeded
		onSuccess();
	};

	const handleBackdropClick = (e: MouseEvent) => {
		if (e.target === e.currentTarget && !isProcessing) {
			onClose();
		}
	};

	// Блокируем скролл основной страницы при открытии модалки
	$effect(() => {
		document.body.style.overflow = "hidden";

		return () => {
			document.body.style.overflow = "";
		};
	});
</script>

<!-- Modal Backdrop -->
<div
	class="fixed inset-0 m-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50"
	onclick={handleBackdropClick}
	onkeydown={(e) => e.key === "Escape" && !isProcessing && onClose()}
	role="dialog"
	aria-modal="true"
	tabindex="-1">
	<!-- Modal Content -->
	<div
		class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto m-4">
		<div class="p-6">
			<!-- Header -->
			<div class="flex justify-between items-center mb-4">
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white">
					Complete Payment
				</h2>
				<button
					onclick={onClose}
					disabled={isProcessing}
					class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
					aria-label="Close">
					<svg
						class="w-6 h-6"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"></path>
					</svg>
				</button>
			</div>

			<!-- Loading State -->
			{#if isLoading}
				<div class="flex justify-center items-center py-12">
					<div
						class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600">
					</div>
				</div>
			{:else}
				<!-- Payment Form -->
				<form onsubmit={handleSubmit}>
					<!-- Stripe Payment Element -->
					<div bind:this={paymentElementContainer} class="mb-4"></div>

					<!-- Submit Button -->
					<button
						type="submit"
						disabled={isProcessing}
						class="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed">
						{isProcessing ? "Processing..." : "Pay Now"}
					</button>
				</form>
			{/if}
		</div>
	</div>
</div>
