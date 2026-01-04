<script lang="ts">
	import '../../app.css';
	import Navigation from '$lib/components/common/Navigation.svelte';
	import ErrorToast from '$lib/components/common/ErrorToast.svelte';
	import { handleCriticalError } from '$lib/stores/error.store';
	import { onMount } from 'svelte';

	// Global error handler for unhandled promise rejections
	onMount(() => {
		const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
			event.preventDefault();
			handleCriticalError(event.reason);
		};

		window.addEventListener('unhandledrejection', handleUnhandledRejection);

		return () => {
			window.removeEventListener('unhandledrejection', handleUnhandledRejection);
		};
	});
</script>

<div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-x-hidden max-w-full">
	<Navigation />
	<main class="flex-1 w-full max-w-7xl mx-auto px-4 py-8">
		<slot />
	</main>
	<ErrorToast />
</div>
