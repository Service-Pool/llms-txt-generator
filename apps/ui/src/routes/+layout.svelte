<script lang="ts">
	import '../app.css';
	import { Footer, FooterCopyright, ThemeProvider } from 'flowbite-svelte';
	import { handleCriticalError } from '$lib/stores/error.store.svelte';
	import { onMount, onDestroy } from 'svelte';
	import ErrorToast from '$lib/components/general/ErrorToast.svelte';
	import Navigation from '$lib/components/general/Navigation.svelte';

	const { children } = $props();

	const theme = {
		card: {
			base: 'shadow-none rounded-lg'
		}
	};
	const THEME_PREFERENCE_KEY = 'THEME_PREFERENCE_KEY';

	const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
		event.preventDefault();
		handleCriticalError(event.reason);
	};

	const handleError = (event: ErrorEvent) => {
		event.preventDefault();
		handleCriticalError(event.error);
	};

	const syncTheme = (event?: StorageEvent) => {
		if (event && event.key !== THEME_PREFERENCE_KEY) {
			return;
		}
		const isDark = localStorage.getItem(THEME_PREFERENCE_KEY) === 'dark';
		document.documentElement.classList.toggle('dark', isDark);
	};

	onMount(() => {
		window.addEventListener('unhandledrejection', handleUnhandledRejection);
		window.addEventListener('error', handleError);
		window.addEventListener('storage', syncTheme);
	});

	onDestroy(() => {
		window.removeEventListener('unhandledrejection', handleUnhandledRejection);
		window.removeEventListener('error', handleError);
		window.removeEventListener('storage', syncTheme);
	});
</script>

<svelte:head>
	<title>LLMs.txt Generator</title>
</svelte:head>

<ThemeProvider {theme}>
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
</ThemeProvider>
