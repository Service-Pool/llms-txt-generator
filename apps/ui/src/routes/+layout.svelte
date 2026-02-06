<script lang="ts">
	import '../app.css';
	import { Footer, FooterCopyright } from 'flowbite-svelte';
	import { handleCriticalError } from '$lib/stores/error.store.svelte';
	import { onMount } from 'svelte';
	import ErrorToast from '$lib/components/general/ErrorToast.svelte';
	import Navigation from '$lib/components/general/Navigation.svelte';

	const { children } = $props();

	// Global error handlers
	onMount(() => {
		const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
			event.preventDefault();
			handleCriticalError(event.reason);
		};

		const handleError = (event: ErrorEvent) => {
			event.preventDefault();
			handleCriticalError(event.error);
		};

		window.addEventListener('unhandledrejection', handleUnhandledRejection);
		window.addEventListener('error', handleError);

		return () => {
			window.removeEventListener('unhandledrejection', handleUnhandledRejection);
			window.removeEventListener('error', handleError);
		};
	});
</script>

<svelte:head>
	<title>LLMs.txt Generator</title>
</svelte:head>

<div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-x-hidden max-w-full">
	<!-- Header -->
	<div class="w-full max-w-7xl mx-auto px-5">
		<Navigation />
	</div>

	<!-- Main Content -->
	<main class="container flex-1 w-full max-w-7xl mx-auto px-5 py-8 relative">
		{@render children()}
	</main>

	<!-- Footer -->
	<Footer class="rounded-none! border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
		<div class="container mx-auto px-4">
			<FooterCopyright href="/" by="LLMs.txt Generator" year={2026} />
		</div>
	</Footer>
</div>

<ErrorToast />
