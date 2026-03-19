<script lang="ts">
	import '../app.css';
	import { authStore } from '$lib/stores/auth.store.svelte';
	import { Footer, FooterCopyright, ThemeProvider } from 'flowbite-svelte';
	import { handleCriticalError } from '$lib/stores/error.store.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import ErrorToast from '$lib/components/ui/error-toast.svelte';
	import Navigation from '$lib/components/layout/navigation.svelte';
	import { configService } from '$lib/services/config.service';

	const { children } = $props();

	// Скрыть навигацию на странице API документации
	const apiPage = $derived(page.url.pathname === '/api');

	const theme = {
		card: {
			base: 'shadow-none rounded-lg'
		},
		button: {
			base: 'shadow-none rounded-sm'
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

	const loadClarity = () => {
		const clarityId = configService.clarity.id;
		if (!clarityId) return;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(function (c: any, l: any, a: any, r: any, i: any, t: any, y: any) {
			c[a] =
				c[a] ||
				function () {
					(c[a].q = c[a].q || []).push(arguments);
				};
			t = l.createElement(r);
			t.async = 1;
			t.src = 'https://www.clarity.ms/tag/' + i;
			y = l.getElementsByTagName(r)[0];
			y.parentNode.insertBefore(t, y);
		})(window, document, 'clarity', 'script', clarityId, null, null);
	};

	onMount(async () => {
		window.addEventListener('unhandledrejection', handleUnhandledRejection);
		window.addEventListener('error', handleError);
		window.addEventListener('storage', syncTheme);

		loadClarity();
		// Don't await - run in background to avoid blocking UI
		authStore.refreshAuthStatus(fetch);
	});

	onDestroy(() => {
		if (!browser) return;
		window.removeEventListener('unhandledrejection', handleUnhandledRejection);
		window.removeEventListener('error', handleError);
		window.removeEventListener('storage', syncTheme);
	});
</script>

<svelte:head>
	<!-- HTML Meta Tags -->
	<title>{configService.seo.title}</title>
	<meta name="description" content={configService.seo.description} />
	<meta name="author" content="David Evdoshchenko" />
	<meta property="article:author" content="https://www.linkedin.com/in/david-evdoshchenko/" />

	<!-- Canonical URL -->
	<link rel="canonical" href={`${configService.site.baseUrl}${page.url.pathname}`} />

	<!-- Facebook Meta Tags -->
	<meta property="og:url" content={`${configService.site.baseUrl}${page.url.pathname}`} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={configService.seo.title} />
	<meta property="og:description" content={configService.seo.description} />
	<meta property="og:image" content={configService.seo.image} />

	<!-- Twitter Meta Tags -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta property="twitter:domain" content={new URL(configService.site.baseUrl).hostname} />
	<meta property="twitter:url" content={`${configService.site.baseUrl}${page.url.pathname}`} />
	<meta name="twitter:title" content={configService.seo.title} />
	<meta name="twitter:description" content={configService.seo.description} />
	<meta name="twitter:image" content={configService.seo.image} />
</svelte:head>

<ThemeProvider {theme}>
	<div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
		{#if apiPage}
			<Navigation sticky fullWidth={true} class="px-5 bg-gray-50 dark:bg-gray-900" />
			<main class="flex-1 w-full">
				{@render children()}
			</main>
		{:else}
			<Navigation sticky class="bg-gray-50 dark:bg-gray-900" />
			<main class="container flex-1 w-full mx-auto px-2 py-8">
				{@render children()}
			</main>
		{/if}

		<!-- Bottom Area / Pre-Footer -->
		<section class="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
			<div class="container mx-auto px-4 py-8">
				<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
					<div>
						<h4 class="font-semibold text-gray-900 dark:text-white mb-4">LLM Ready</h4>
						<p class="text-gray-600 dark:text-gray-400 text-sm">
							Generate optimized LLMs.txt files for your websites using advanced AI models.
						</p>
					</div>

					<div>
						<h4 class="font-semibold text-gray-900 dark:text-white mb-4">Quick Links</h4>
						<ul class="space-y-2">
							<li>
								<a
									href={configService.routes.home}
									class="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm"
									>New Generation</a
								>
							</li>
							<li>
								<a
									href={configService.routes.orders}
									class="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm"
									>Your Generations</a
								>
							</li>
							<li>
								<a
									href={configService.routes.api}
									target="_blank"
									class="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm"
									>API Documentation</a
								>
							</li>
						</ul>
					</div>

					<div>
						<h4 class="font-semibold text-gray-900 dark:text-white mb-4">Legal</h4>
						<ul class="space-y-2">
							<li>
								<a
									href={configService.routes.terms}
									class="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm"
									>Terms of Service</a
								>
							</li>
							<li>
								<a
									href={configService.routes.contact}
									class="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm">Contact</a
								>
							</li>
						</ul>
					</div>
				</div>
			</div>
		</section>

		<Footer class="rounded-none! border-t border-gray-200 dark:border-gray-700 bg-gray-200 dark:bg-gray-950">
			<div class="container mx-auto px-4">
				<FooterCopyright href={configService.routes.home} by="LLMs.txt Generator" year={2026} />
			</div>
		</Footer>
	</div>

	<ErrorToast />
</ThemeProvider>
