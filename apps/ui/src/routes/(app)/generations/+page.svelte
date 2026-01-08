<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { HttpClientError } from "../../../lib/api/http.client";
	import {
		GenerationStatus,
		type GenerationRequestDtoResponse,
	} from "@api/shared";
	import { GenerationsService } from "$lib/api/generations.service";
	import { AppConfigService } from "$lib/api/config.service";
	import { WebSocketService } from "$lib/services/websocket.service";
	import type {
		GenerationProgressEvent,
		GenerationStatusEvent,
	} from "$lib/types/websocket.types";
	import GenerationsList from "$lib/components/features/GenerationsList.svelte";
	import NewGenerationForm from "$lib/components/features/NewGenerationForm.svelte";
	import Spinner from "$lib/components/common/Spinner.svelte";

	const generationsService = new GenerationsService();
	const configService = new AppConfigService();

	let items = $state<GenerationRequestDtoResponse[]>([]);
	let total = $state(0);
	let page = $state(1);
	let limit = $state(5);
	let showLoadingSpinner = $state(true);
	let error = $state<string | null>(null);

	// Record of generationId -> { processedUrls, totalUrls }
	let progressMap = $state<
		Record<number, { processedUrls: number; totalUrls: number }>
	>({});

	let ws: WebSocketService | null = null;

	const loadGenerations = async () => {
		try {
			showLoadingSpinner = true;
			error = null;

			const response = await generationsService.list(page, limit);

			items = response.getMessage().data.items;
			total = response.getMessage().data.total;

			// Subscribe will happen in handleConnect when WebSocket is ready
			subscribeToCurrentItems();
		} catch (err) {
			if (err instanceof HttpClientError) {
				error = err.message;
			}
			throw err;
		} finally {
			showLoadingSpinner = false;
		}
	};

	const subscribeToCurrentItems = () => {
		if (ws && items.length > 0) {
			const generationIds = items.map((item) => item.generationId);
			ws.subscribe(generationIds);
		}
	};

	const handlePageChange = (newPage: number) => {
		page = newPage;
		loadGenerations();
	};

	const handleLimitChange = (newLimit: number) => {
		limit = newLimit;
		page = 1; // Reset to first page
		loadGenerations();
	};

	const handleDelete = async (requestId: number) => {
		const deletedItem = items.find((item) => item.id === requestId);

		await generationsService.delete(requestId);

		// Unsubscribe from WebSocket
		if (ws && deletedItem?.generationId) {
			ws.unsubscribe([deletedItem.generationId]);
		}

		// Remove progress
		if (deletedItem?.generationId) {
			delete progressMap[deletedItem.generationId];
		}

		// Reload data to get correct pagination
		await loadGenerations();
	};

	const handleCreate = (newGeneration: GenerationRequestDtoResponse) => {
		// Subscribe to this generation via WebSocket
		if (ws && newGeneration.generationId) {
			ws.subscribe([newGeneration.generationId]);
		}

		// Add new generation to the top of the list
		items = [newGeneration, ...items];

		// Increment total count
		total = total + 1;
	};

	const handleProgress = (event: GenerationProgressEvent) => {
		// Update progressMap with new reference for reactivity
		progressMap = {
			...progressMap,
			[event.generationId]: {
				processedUrls: event.processedUrls,
				totalUrls: event.totalUrls,
			},
		};

		// Update status - replace entire array for reactivity
		items = items.map((item) => {
			if (item.generationId === event.generationId) {
				return {
					...item,
					status: event.status as GenerationStatus,
				};
			}
			return item;
		});
	};

	const handleStatus = (event: GenerationStatusEvent) => {
		// Update item - replace instead of mutating
		items = items.map((item) => {
			if (item.generationId === event.generationId) {
				return {
					...item,
					status: event.status as GenerationStatus,
					content: event.content || null,
					errorMessage: event.errorMessage || null,
					entriesCount: event.entriesCount || null,
				};
			}
			return item;
		});

		// Remove progress when completed or failed
		if (
			event.status === GenerationStatus.COMPLETED ||
			event.status === GenerationStatus.FAILED
		) {
			delete progressMap[event.generationId];
			progressMap = { ...progressMap }; // Trigger reactivity
		}
	};

	const handleConnect = () => {
		subscribeToCurrentItems();
	};

	onMount(async () => {
		// Load initial data first - this creates session and sends cookie
		await loadGenerations();

		// Initialize WebSocket after HTTP request
		ws = WebSocketService.getInstance(configService.websocket.url);
		ws.connect();

		// Listen to events
		ws.on("connect", handleConnect);
		ws.on("progress", handleProgress as (...args: unknown[]) => void);
		ws.on("status", handleStatus as (...args: unknown[]) => void);
	});

	onDestroy(() => {
		if (ws) {
			// Cleanup listeners
			ws.off("connect", handleConnect);
			ws.off("progress", handleProgress as (...args: unknown[]) => void);
			ws.off("status", handleStatus as (...args: unknown[]) => void);

			// Disconnect
			ws.disconnect();
		}
	});
</script>

<svelte:head>
	<title>LLMs.txt Generator</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-6">
	<!-- Form -->
	<NewGenerationForm onCreate={handleCreate} />

	<!-- List -->
	{#if showLoadingSpinner}
		<div class="flex justify-center py-12">
			<Spinner size="lg" color="#3b82f6" delay={1000} />
		</div>
	{:else if error}
		<div
			class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
			<p class="text-red-800 dark:text-red-200">{error}</p>
			<button
				onclick={() => loadGenerations()}
				class="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline">
				Try again
			</button>
		</div>
	{:else}
		<GenerationsList
			{items}
			{total}
			{page}
			{limit}
			{progressMap}
			onPageChange={handlePageChange}
			onLimitChange={handleLimitChange}
			onDelete={handleDelete} />
	{/if}
</div>
