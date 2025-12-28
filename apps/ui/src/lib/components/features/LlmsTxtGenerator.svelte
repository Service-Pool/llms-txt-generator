<script lang="ts">
	import { Button, Input, Select, Card, Alert, Spinner, Badge, Label } from 'flowbite-svelte';
	import { Provider, GenerationStatus, type GenerationDto } from '@api/shared';
	import type { ProgressEvent, ErrorInfo } from '$lib/types/ui.types';
	import { generationsService } from '$lib/api';
	import ResultDisplay from './ResultDisplay.svelte';

	type Stage = 'config' | 'processing' | 'completed' | 'error';
	let stage = $state<Stage>('config');

	let provider = $state<Provider>(Provider.OLLAMA);
	let websiteUrl = $state('');

	let currentGeneration = $state<GenerationDto | null>(null);
	let status = $state<GenerationStatus>(GenerationStatus.WAITING);
	let progress = $state<ProgressEvent>({ current: 0, total: 100, message: '' });
	let result = $state<string>('');
	let error = $state<ErrorInfo | null>(null);

	const providers = [
		{ value: Provider.OLLAMA, name: 'Ollama (qwen2.5:1.5b)' },
		{ value: Provider.GEMINI, name: 'Gemini (Google)' }
	];

	let isUrlValid = $derived(/^https?:\/\/.+/.test(websiteUrl));
	let canStartGeneration = $derived(isUrlValid && stage === 'config');

	function resetState() {
		stage = 'config';
		status = GenerationStatus.WAITING;
		progress = { current: 0, total: 100, message: '' };
		result = '';
		error = null;
		currentGeneration = null;
	}

	function updateProgressMessage(generation: GenerationDto) {
		status = generation.status;

		switch (generation.status) {
			case GenerationStatus.WAITING:
				progress = { current: 0, total: 100, message: 'Waiting in queue...' };
				break;
			case GenerationStatus.ACTIVE:
				progress = { current: 50, total: 100, message: 'Processing website...' };
				break;
			case GenerationStatus.COMPLETED:
				progress = { current: 100, total: 100, message: 'Completed!' };
				break;
			case GenerationStatus.FAILED:
				progress = { current: 0, total: 100, message: 'Failed' };
				break;
		}
	}

	async function handleStartGeneration() {
		try {
			stage = 'processing';
			status = GenerationStatus.WAITING;
			progress = { current: 0, total: 100, message: 'Creating generation request...' };
			error = null;

			const url = new URL(websiteUrl);
			const hostname = url.origin;

			const createResponse = await generationsService.create({
				hostname,
				provider
			});

			if (!createResponse.message) {
				throw new Error(createResponse.error || 'Failed to create generation');
			}

			currentGeneration = createResponse.message;

			if (currentGeneration.status === GenerationStatus.COMPLETED && currentGeneration.content) {
				stage = 'completed';
				result = currentGeneration.content;
				updateProgressMessage(currentGeneration);
				return;
			}

			progress = { current: 10, total: 100, message: 'Waiting for processing...' };

			const completedGeneration = await generationsService.pollUntilComplete(
				currentGeneration.id,
				(gen) => {
					currentGeneration = gen;
					updateProgressMessage(gen);
				}
			);

			stage = 'completed';
			status = GenerationStatus.COMPLETED;
			result = completedGeneration.content || '';
			updateProgressMessage(completedGeneration);

		} catch (err: unknown) {
			stage = 'error';
			status = GenerationStatus.FAILED;
			error = {
				message: err instanceof Error ? err.message : 'Failed to generate llms.txt',
				recoverable: true,
				timestamp: Date.now()
			};
		}
	}

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(result);
			alert('Copied to clipboard!');
		} catch (err) {
			alert('Failed to copy to clipboard');
		}
	}

	function handleDownload() {
		const blob = new Blob([result], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'llms.txt';
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<Card class="max-w-4xl mx-auto p-6">
	<h1 class="text-3xl font-bold mb-6 text-gray-900 dark:text-white">LLMs.txt Generator</h1>

	{#if stage === 'config'}
		<div class="space-y-4">
			<div>
				<Label for="provider" class="mb-2">AI Provider</Label>
				<Select id="provider" bind:value={provider} items={providers} />
			</div>

			<div>
				<Label for="url" class="mb-2">Website URL</Label>
				<Input
					id="url"
					type="text"
					bind:value={websiteUrl}
					placeholder="https://example.com"
					class={!isUrlValid && websiteUrl ? 'border-red-500' : ''}
				/>
				{#if !isUrlValid && websiteUrl}
					<p class="mt-1 text-sm text-red-500">Please enter a valid URL</p>
				{/if}
			</div>

			<Button onclick={handleStartGeneration} disabled={!canStartGeneration} size="lg" color="blue" class="w-full">
				Generate LLMs.txt
			</Button>
		</div>
	{/if}

	{#if stage === 'processing'}
		<div class="space-y-4">
			<div class="flex items-center gap-3">
				<Spinner size="5" color="red" />
				<div class="flex-1">
					<Badge color="blue">{status}</Badge>
					<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
						{progress.message}
					</p>
					{#if progress.total > 0}
						<div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
							<div
								class="bg-blue-600 h-2.5 rounded-full transition-all"
								style="width: {(progress.current / progress.total) * 100}%"
							></div>
						</div>
					{/if}
				</div>
			</div>

			{#if currentGeneration}
				<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
					<p class="text-gray-600 dark:text-gray-400">
						Generation ID: <span class="font-mono">{currentGeneration.id}</span>
					</p>
					<p class="text-gray-600 dark:text-gray-400">
						Hostname: <span class="font-mono">{currentGeneration.hostname}</span>
					</p>
				</div>
			{/if}
		</div>
	{/if}

	{#if stage === 'error' && error}
		<div class="space-y-4">
			<Alert color="red">
				<span class="font-medium">Error:</span>
				{error.message}
			</Alert>

			<Button onclick={resetState} size="lg" color="alternative" class="w-full">Try Again</Button>
		</div>
	{/if}

	{#if stage === 'completed' && result}
		<div class="space-y-4">
			<Alert color="green">
				<span class="font-medium">Success!</span>
				llms.txt generated successfully
			</Alert>

			{#if currentGeneration?.entriesCount}
				<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
					<p class="text-lg font-semibold text-gray-900 dark:text-white">
						{currentGeneration.entriesCount} entries processed
					</p>
				</div>
			{/if}

			<ResultDisplay content={result} />

			<div class="flex gap-2">
				<Button onclick={handleCopy} size="lg" class="flex-1" color="light">Copy to Clipboard</Button>
				<Button onclick={handleDownload} size="lg" class="flex-1" color="light">Download</Button>
			</div>

			<Button onclick={resetState} size="lg" class="w-full" color="alternative">New Generation</Button>
		</div>
	{/if}
</Card>
