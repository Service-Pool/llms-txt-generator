<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { configService } from '$lib/services/config.service';
	import { Spinner, Alert, Button } from 'flowbite-svelte';
	import redocStandaloneUrl from 'redoc/bundles/redoc.standalone.js?url';

	let redocContainer = $state<HTMLElement>();
	let loading = $state(true);
	let error = $state<string | null>(null);

	const SPEC_EXTRA = {};

	// Конфигурация Redoc: только реальные ключи темы из Redoc
	const REDOC_CONFIG = {
		theme: {
			spacing: {
				unit: 5,
				sectionHorizontal: 40,
				sectionVertical: 40
			},
			breakpoints: {
				small: '50rem',
				medium: '85rem',
				large: '105rem'
			},
			colors: {
				tonalOffset: 0.3
			},
			typography: {
				fontSize: '14px',
				lineHeight: '1.5em',
				fontWeightRegular: '400',
				fontWeightBold: '600',
				fontWeightLight: '300',
				fontFamily: 'Roboto, sans-serif',
				smoothing: 'antialiased',
				optimizeSpeed: true,
				headings: {
					fontFamily: 'Montserrat, sans-serif',
					fontWeight: '400',
					lineHeight: '1.6em'
				},
				code: {
					fontSize: '13px',
					fontFamily: 'Courier, monospace',
					lineHeight: '1.5em',
					color: '#e53935',
					backgroundColor: 'rgba(38, 50, 56, 0.05)',
					wrap: false
				},
				links: {
					textDecoration: 'auto',
					hoverTextDecoration: 'auto'
				}
			},
			sidebar: {
				width: '260px',
				backgroundColor: 'transparent',
				textColor: '#333333',
				groupItems: {
					textTransform: 'uppercase'
				},
				level1Items: {
					textTransform: 'none'
				},
				arrow: {
					size: '1.5em'
				}
			},
			logo: {
				gutter: '2px'
			},
			rightPanel: {
				backgroundColor: '#263238',
				width: '40%',
				textColor: '#ffffff'
			},
			servers: {
				overlay: {
					backgroundColor: '#fafafa',
					textColor: '#263238'
				},
				url: {
					backgroundColor: '#ffffff'
				}
			},
			fab: {
				backgroundColor: '#263238',
				color: '#ffffff'
			}
		},
		scrollYOffset: 92,
		hideDownloadButton: false,
		disableSearch: false,
		noAutoAuth: false
	};

	onMount(() => {
		const apiUrl = configService.api.baseUrl;
		const openApiUrl = `${apiUrl}/api/llms-txt-generator-api-schema.json`;
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
		const merge = (target: any, source: any) => {
			for (const key in source) {
				if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
					target[key] = merge(target[key] ?? {}, source[key]);
				} else {
					if (!(key in target)) {
						target[key] = source[key];
					}
				}
			}
			return target;
		};

		try {
			// Проверяем доступность глобального Redoc из standalone bundle
			if (!window.Redoc) {
				throw new Error('Redoc library not loaded');
			}

			// Проверяем что контейнер готов
			if (!redocContainer) {
				throw new Error('Redoc container not ready');
			}

			// Загружаем спецификацию OpenAPI
			const response = await fetch(openApiUrl);
			if (!response.ok) {
				throw new Error(`Failed to fetch OpenAPI spec: ${response.status} ${response.statusText}`);
			}

			const spec = merge(await response.json(), SPEC_EXTRA);

			// Рендерим документацию из объекта спецификации
			await window.Redoc.init(spec, REDOC_CONFIG, redocContainer);
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

<div class="w-full">
	{#if loading}
		<div class="flex justify-center items-center py-12">
			<Spinner size="8" class="mr-3" />
			<span class="text-gray-600 dark:text-gray-400">Loading API documentation...</span>
		</div>
	{:else if error}
		<Alert border={true} color="red" class="max-w-2xl mt-10 mx-auto p-6">
			<h3 class="text-red-800 dark:text-red-200 font-medium mb-2">Error Loading Documentation</h3>
			<p class="text-red-600 dark:text-red-300 text-sm">{error}</p>
			<Button onclick={() => window.location.reload()} color="red" class="mt-3 px-3 py-1">Try Again</Button>
		</Alert>
	{:else}
		<!-- Redoc контейнер (изолирован от глобальных Tailwind-стилей) -->
		<div class="redoc-root w-full h-full">
			<div bind:this={redocContainer} class="redoc-container w-full h-full"></div>
		</div>
	{/if}
</div>

<style>
	/* Базовый фон/текст для Redoc, одинаковый в светлой и тёмной темах */
	:global(.redoc-root) {
		background: #fafafa;
	}

	/* Сбрасываем все наши Tailwind-правила внутри Redoc, чтобы оставить только его стили */
	:global(.redoc-root *),
	:global(.redoc-root *::before),
	:global(.redoc-root *::after) {
		font: revert;
		color: revert;
		background: revert;
		margin: revert;
		padding: revert;
		border: revert;
		display: revert;
	}
	:global(.redoc-root .redoc-wrap > :first-child) {
		border-right: 1px solid #e0e0e0;
	}
</style>
