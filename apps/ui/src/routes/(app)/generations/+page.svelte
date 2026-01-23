<script lang="ts">
	import { type GenerationRequestUpdateEvent } from "$lib/types/websocket.types";
	import { type GenerationRequestDtoResponse } from "@api/shared";
	import { onMount, onDestroy } from "svelte";
	import { HttpClientError } from "../../../lib/api/http.client";
	import { generationsService } from "$lib/api/generations.service";
	import { configService } from "$lib/api/config.service";
	import { WebSocketService } from "$lib/services/websocket.service";
	import GenerationsList from "$lib/components/features/GenerationsList.svelte";
	import NewGenerationForm from "$lib/components/features/NewGenerationForm.svelte";
	import Spinner from "$lib/components/common/Spinner.svelte";
	import { Alert, Button } from "flowbite-svelte";

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
			const generationIds = items.map((item) => item.generation.id);
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
		if (ws && deletedItem?.generation.id) {
			ws.unsubscribe([deletedItem.generation.id]);
		}

		// Remove progress
		if (deletedItem?.generation.id) {
			delete progressMap[deletedItem.generation.id];
		}

		// Reload data to get correct pagination
		await loadGenerations();
	};

	const handleCreate = (newGeneration: GenerationRequestDtoResponse) => {
		// Subscribe to this generation via WebSocket
		if (ws && newGeneration.generation.id) {
			ws.subscribe([newGeneration.generation.id]);
		}

		// Remove existing item with same ID if it exists (shouldn't happen, but defensive)
		items = items.filter((item) => item.id !== newGeneration.id);

		// Add new generation to the top of the list
		items = [newGeneration, ...items];

		// Increment total count
		total = total + 1;
	};

	const handlePaymentSuccess = async (requestId: number) => {
		// Обновляем только оплаченную генерацию из сервера
		const response = await generationsService.refreshOne(requestId);
		const refreshedItems = response.getMessage().data.items;

		if (refreshedItems.length > 0) {
			const refreshedItem = refreshedItems[0];
			// Обновляем элемент в массиве
			items = items.map((item) =>
				item.id === requestId ? refreshedItem : item,
			);
		}
	};

	const handleUpdate = (event: GenerationRequestUpdateEvent) => {
		// Update the entire item with the new data from the event
		items = items.map((item) => {
			if (item.generation.id === event.generationRequest.generation.id) {
				return event.generationRequest;
			}
			return item;
		});

		// Update progress map if processedUrls is provided
		if (event.processedUrls !== undefined) {
			progressMap = {
				...progressMap,
				[event.generationRequest.generation.id]: {
					processedUrls: event.processedUrls,
					totalUrls: event.generationRequest.generation.urlsCount,
				},
			};
		} else {
			// Remove progress when job is completed/failed (no processedUrls)
			delete progressMap[event.generationRequest.generation.id];
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
		ws.on("update", handleUpdate as (...args: unknown[]) => void);
	});

	onDestroy(() => {
		if (ws) {
			// Cleanup listeners
			ws.off("connect", handleConnect);
			ws.off("update", handleUpdate as (...args: unknown[]) => void);

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
			<Spinner size="12" delay={300} />
		</div>
	{:else if error}
		<Alert color="red">
			<p>{error}</p>
			<Button
				onclick={() => loadGenerations()}
				size="xs"
				color="red"
				class="mt-2">
				Try again
			</Button>
		</Alert>
	{:else}
		<GenerationsList
			{items}
			{total}
			{page}
			{limit}
			{progressMap}
			onPageChange={handlePageChange}
			onLimitChange={handleLimitChange}
			onDelete={handleDelete}
			onPaymentSuccess={handlePaymentSuccess} />
	{/if}
</div>
