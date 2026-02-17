<script lang="ts">
	import { Modal, Button, Spinner } from 'flowbite-svelte';
	import { slide } from 'svelte/transition';
	import DelayedRender from '$lib/components/ui/delayed-render.svelte';
	import { loadStripe, type Stripe, type StripeElements } from '@stripe/stripe-js';
	import { onMount, tick } from 'svelte';

	interface Props {
		clientSecret: string;
		publishableKey: string;
		onSuccess: () => void;
		onClose: () => void;
	}

	let { clientSecret, publishableKey, onSuccess, onClose }: Props = $props();

	let isOpen = $state(true);
	let stripe: Stripe | null = $state(null);
	let elements: StripeElements | null = $state(null);
	let isLoading = $state(true);
	let isProcessing = $state(false);
	let paymentElementContainer: HTMLDivElement | undefined = $state(undefined);
	let paymentElement: any = null;

	onMount(async () => {
		stripe = await loadStripe(publishableKey);

		if (!stripe) {
			throw new Error('Failed to load Stripe');
		}

		elements = stripe.elements({ clientSecret });
		isLoading = false;

		// Ждем обновления DOM чтобы контейнер был готов
		await tick();

		if (paymentElementContainer) {
			paymentElement = elements.create('payment');
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
				return_url: window.location.origin + '/orders'
			},
			redirect: 'if_required'
		});

		if (error) {
			isProcessing = false;
			throw new Error(error.message || 'Payment failed');
		}

		// Payment succeeded
		onSuccess();
	};

	const handleClose = () => {
		if (!isProcessing) {
			isOpen = false;
			onClose();
		}
	};
</script>

<Modal
	bind:open={isOpen}
	size="md"
	permanent={isProcessing}
	transition={slide}
	dismissable={!isProcessing}
	outsideclose={!isProcessing}
	onclose={handleClose}
	title="Complete Payment"
>
	<!-- Loading State -->
	{#if isLoading}
		<div class="flex justify-center items-center py-12">
			<DelayedRender>
				<Spinner size="12" />
			</DelayedRender>
		</div>
	{:else}
		<!-- Payment Form -->
		<form onsubmit={handleSubmit}>
			<!-- Stripe Payment Element -->
			<div bind:this={paymentElementContainer} class="mb-4"></div>

			<!-- Submit Button -->
			<Button type="submit" disabled={isProcessing} color="blue" class="w-full">
				{isProcessing ? 'Processing...' : 'Pay Now'}
			</Button>
		</form>
	{/if}
</Modal>
