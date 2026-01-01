<script lang="ts">
	import { Provider, CreateGenerationDtoRequest, type GenerationRequestDtoResponse } from '@api/shared';
	import { GenerationsService } from '$lib/api/generations.service';
	import Spinner from '../common/Spinner.svelte';

	interface Props {
		onCreate: (generation: GenerationRequestDtoResponse) => void;
	}

	let { onCreate }: Props = $props();

	const generationsService = new GenerationsService();

	let provider = $state<Provider>(Provider.OLLAMA);
	let websiteUrl = $state('');
	let submitting = $state(false);
	let showSpinner = $state(false);
	let error = $state<string | null>(null);
	let spinnerTimeout: ReturnType<typeof setTimeout> | null = null;

	const providers = [
		{ value: Provider.OLLAMA, name: 'Free (Ollama)' },
		{ value: Provider.GEMINI, name: 'Fast (Gemini)' }
	];

	const isUrlValid = $derived(/^https?:\/\/.+/.test(websiteUrl));
	const canSubmit = $derived(isUrlValid && !submitting);

	const handleSubmit = async (e: Event) => {
		e.preventDefault();

		if (!canSubmit) return;

		try {
			submitting = true;
			showSpinner = false;
			error = null;

			// Show spinner only after 500ms
			spinnerTimeout = setTimeout(() => {
				showSpinner = true;
			}, 500);

			const url = new URL(websiteUrl);
			const hostname = url.origin;

			const response = await generationsService.create(
				new CreateGenerationDtoRequest(hostname, provider)
			);

			if (!response.message) {
				throw new Error(response.error || 'Failed to create generation');
			}

			// Call parent callback
			onCreate(response.message);

			// Clear form
			websiteUrl = '';
			provider = Provider.OLLAMA;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			submitting = false;
			showSpinner = false;
			if (spinnerTimeout) {
				clearTimeout(spinnerTimeout);
			}
		}
	};
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
	<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">
		Create New Generation
	</h2>

	<form onsubmit={handleSubmit} class="space-y-4">
		<!-- Provider Select -->
		<div>
			<label for="provider" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
				AI Provider
			</label>
			<select
				id="provider"
				bind:value={provider}
				disabled={submitting}
				class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
			>
				{#each providers as p}
					<option value={p.value}>{p.name}</option>
				{/each}
			</select>
		</div>

		<!-- Website URL Input -->
		<div>
			<label for="url" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
				Website URL
			</label>
			<input
				id="url"
				type="text"
				bind:value={websiteUrl}
				disabled={submitting}
				placeholder="https://example.com"
				class="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 {!isUrlValid && websiteUrl ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}"
			/>
			{#if !isUrlValid && websiteUrl}
				<p class="mt-1 text-sm text-red-600 dark:text-red-400">
					Please enter a valid URL (must start with http:// or https://)
				</p>
			{/if}
		</div>

		<!-- Error Message -->
		{#if error}
			<div class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
				<p class="text-sm text-red-800 dark:text-red-200">{error}</p>
			</div>
		{/if}

		<!-- Submit Button -->
		<button
			type="submit"
			disabled={!canSubmit}
			class="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
		>
			{#if showSpinner}
				<span class="flex items-center justify-center gap-2">
					<Spinner size="sm" color="#ffffff" delay={1000} />
					Creating...
				</span>
			{:else}
				Generate
			{/if}
		</button>
	</form>
</div>
