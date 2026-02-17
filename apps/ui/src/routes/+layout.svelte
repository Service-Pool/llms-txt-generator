<script lang="ts">
	import '../app.css';
	import { authStore } from '$lib/stores/auth.store.svelte';
	import { Footer, FooterCopyright, ThemeProvider } from 'flowbite-svelte';
	import { handleCriticalError } from '$lib/stores/error.store.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/state';
	import ErrorToast from '$lib/components/ui/error-toast.svelte';
	import Navigation from '$lib/components/layout/navigation.svelte';

	const { children } = $props();

	// Скрыть навигацию на странице API документации
	const apiPage = $derived(page.url.pathname === '/api');

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

	onMount(async () => {
		window.addEventListener('unhandledrejection', handleUnhandledRejection);
		window.addEventListener('error', handleError);
		window.addEventListener('storage', syncTheme);

		await authStore.refreshAuthStatus(fetch);
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
	<div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
		{#if apiPage}
			<Navigation sticky />
			<main class="flex-1 w-full">
				{@render children()}
			</main>
		{:else}
			<Navigation />
			<main class="container flex-1 w-full mx-auto px-5 py-8">
				{@render children()}
			</main>
		{/if}
	</div>

	<Footer class="rounded-none! border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
		<div class="container mx-auto px-4">
			<FooterCopyright href="/" by="LLMs.txt Generator" year={2026} />
		</div>
	</Footer>

	<ErrorToast />
</ThemeProvider>
