<script lang="ts">
	import { Button, Input, Textarea, Label, Card, P, Alert } from 'flowbite-svelte';
	import { InfoCircleSolid, CheckCircleSolid } from 'flowbite-svelte-icons';

	interface Props {
		workerUrl: string;
		class?: string;
	}

	let { workerUrl, class: className = '' }: Props = $props();

	// Constants
	const MAX_MESSAGE_LENGTH = 4000;

	// Form state
	let name = $state('');
	let email = $state('');
	let message = $state('');

	// UI state
	let isSubmitting = $state(false);
	let showSuccess = $state(false);
	let errorMessage = $state('');

	// Validation
	const isValidEmail = $derived(email.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

	const isFormValid = $derived(
		name.trim().length >= 2 &&
			email.trim().length > 0 &&
			isValidEmail &&
			message.trim().length >= 10 &&
			message.trim().length <= MAX_MESSAGE_LENGTH
	);

	async function handleSubmit() {
		if (!isFormValid || isSubmitting) return;

		isSubmitting = true;
		errorMessage = '';
		showSuccess = false;

		try {
			const response = await fetch(workerUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: name.trim(),
					email: email.trim(),
					message: message.trim()
				})
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to send message');
			}

			// Success
			showSuccess = true;
			name = '';
			email = '';
			message = '';

			// Hide success message after 5 seconds
			setTimeout(() => {
				showSuccess = false;
			}, 5000);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to send message. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		// Submit on Ctrl+Enter
		if (event.ctrlKey && event.key === 'Enter') {
			handleSubmit();
		}
	}
</script>

<!--
  ContactForm Component
  
  Props:
  - workerUrl: string - URL of Cloudflare Worker endpoint
  - class: string - CSS classes for root element
  
  Features:
  - Validates email format
  - Validates message length (10-5000 chars)
  - Shows success/error messages
  - Ctrl+Enter to submit
-->
<Card class="p-8 {className}">
	<h3 class="text-2xl font-bold mb-4 dark:text-white">Contact Us</h3>

	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
		class="space-y-4"
	>
		<!-- Name field -->
		<div>
			<Label for="contact-name" class="mb-2">Name</Label>
			<Input id="contact-name" type="text" placeholder="Your name" bind:value={name} disabled={isSubmitting} required />
		</div>

		<!-- Email field -->
		<div>
			<Label for="contact-email" class="mb-2">Email</Label>
			<Input
				id="contact-email"
				type="email"
				placeholder="your@email.com"
				bind:value={email}
				disabled={isSubmitting}
				color={email.length > 0 && !isValidEmail ? 'red' : 'gray'}
				required
			/>
			{#if email.length > 0 && !isValidEmail}
				<P size="xs" class="mt-1 text-red-600 dark:text-red-400">Please enter a valid email address</P>
			{/if}
		</div>

		<!-- Message field -->
		<div>
			<Label for="contact-message" class="mb-2">
				Message
				<span class="text-sm text-gray-500 dark:text-gray-400 ml-2">
					({message.length}/{MAX_MESSAGE_LENGTH})
				</span>
			</Label>
			<Textarea
				id="contact-message"
				placeholder="Your message..."
				rows={6}
				bind:value={message}
				onkeydown={handleKeyDown}
				disabled={isSubmitting}
				class="w-full"
				required
			/>
			{#if message.length > 0 && message.length < 10}
				<P size="xs" class="mt-1 text-gray-600 dark:text-gray-400">Message must be at least 10 characters</P>
			{/if}
			{#if message.length > MAX_MESSAGE_LENGTH}
				<P size="xs" class="mt-1 text-red-600 dark:text-red-400">Message is too long (max {MAX_MESSAGE_LENGTH} characters)</P>
			{/if}
		</div>

		<!-- Success Alert -->
		{#if showSuccess}
			<Alert color="green" class="flex items-center gap-2">
				<CheckCircleSolid slot="icon" class="w-4 h-4" />
				<span class="font-medium">Message sent successfully!</span> We'll get back to you soon.
			</Alert>
		{/if}

		<!-- Error Alert -->
		{#if errorMessage}
			<Alert color="red" class="flex items-center gap-2">
				<InfoCircleSolid slot="icon" class="w-4 h-4" />
				<span class="font-medium">Error:</span>
				{errorMessage}
			</Alert>
		{/if}

		<!-- Submit button -->
		<div class="flex justify-end gap-2">
			<Button type="submit" disabled={!isFormValid || isSubmitting} class="min-w-32">
				{isSubmitting ? 'Sending...' : 'Send Message'}
			</Button>
		</div>

		<P size="xs" class="text-gray-500 dark:text-gray-400 text-center">Press Ctrl+Enter to submit</P>
	</form>
</Card>
