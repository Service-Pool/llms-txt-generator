<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { configService } from '$lib/services/config.service';
	import { Heading, Spinner, Alert, Button } from 'flowbite-svelte';
	import redocStandaloneUrl from 'redoc/bundles/redoc.standalone.js?url';

	let redocContainer = $state<HTMLElement>();
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(() => {
		const apiUrl = configService.api.baseUrl;
		const openApiUrl = `${apiUrl}/api/openapi.json`;
		const redocScript = document.createElement('script');

		redocScript.src = redocStandaloneUrl;
		redocScript.onload = async () => {
			try {
				loading = false;
				await tick();
				await loadApiDocs(openApiUrl);
			} catch (exception) {
				const errorMessage = exception instanceof Error ? exception.message : 'Unknown error occurred';
				error = `Failed to load API documentation: ${errorMessage}`;
				loading = false;
			}
		};
		redocScript.onerror = () => {
			error = 'Failed to load Redoc bundle from node_modules';
			loading = false;
		};

		document.head.appendChild(redocScript);

		// Cleanup при демонтаже компонента
		return () => {
			if (redocScript.parentNode) {
				redocScript.parentNode.removeChild(redocScript);
			}
		};
	});

	async function loadApiDocs(openApiUrl: string) {
		try {
			// Проверяем доступность глобального Redoc из standalone bundle
			if (!window.Redoc) {
				throw new Error('Redoc library not loaded');
			}

			// Проверяем что контейнер готов
			if (!redocContainer) {
				throw new Error('Redoc container not ready');
			}

			// Загружаем и рендерим документацию
			await window.Redoc.init(
				openApiUrl,
				{
					theme: {
						colors: {
							primary: {
								main: '#3B82F6' // Tailwind blue-500
							}
						},
						typography: {
							fontSize: '14px',
							fontFamily: 'Inter, sans-serif'
						}
					},
					scrollYOffset: 60,
					hideDownloadButton: false,
					disableSearch: false,
					noAutoAuth: false
				},
				redocContainer
			);
		} catch (exception) {
			const errorMessage = exception instanceof Error ? exception.message : 'Unknown error occurred';
			error = `Failed to load API documentation: ${errorMessage}`;
			throw exception;
		}
	}
</script>

<svelte:head>
	<title>API Documentation - LLMs.txt Generator</title>
	<meta name="description" content="Interactive API documentation for the LLMs.txt Generator API" />
</svelte:head>

<div class="max-w-full mx-auto">
	<div class="text-center mb-6 px-4">
		<Heading tag="h1" class="mb-2">API Documentation</Heading>
		<p class="text-gray-600 dark:text-gray-400">Interactive documentation for the LLMs.txt Generator API</p>
	</div>

	{#if loading}
		<div class="flex justify-center items-center py-12">
			<Spinner size="8" class="mr-3" />
			<span class="text-gray-600 dark:text-gray-400">Loading API documentation...</span>
		</div>
	{:else if error}
		<Alert border={true} color="red" class="max-w-2xl mx-auto p-6">
			<h3 class="text-red-800 dark:text-red-200 font-medium mb-2">Error Loading Documentation</h3>
			<p class="text-red-600 dark:text-red-300 text-sm">{error}</p>
			<Button onclick={() => window.location.reload()} color="red" class="mt-3 px-3 py-1">Try Again</Button>
		</Alert>
	{:else}
		<!-- Redoc контейнер -->
		<div bind:this={redocContainer} class="redoc-container"></div>
	{/if}
</div>

<style>
	/* Стили для интеграции Redoc с нашим дизайном */
	:global(.redoc-container) {
		font-family: 'Inter', sans-serif;
	}

	:global(.redoc-wrap) {
		background-color: transparent;
	}

	/* Overrides для темной темы */
	:global(.dark .redoc-container .redoc-wrap) {
		background-color: rgb(17 24 39); /* gray-900 */
		color: rgb(243 244 246); /* gray-100 */
	}

	/* Скрытие лого Redoc если нужно */
	:global(.redoc-container .redoc-wrap .api-info > div:last-child) {
		display: none;
	}
</style>
