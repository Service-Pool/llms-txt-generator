<script lang="ts">
	import { goto } from "$app/navigation";
	import { generationsService } from "$lib/api/generations.service";
	import { calculateService } from "$lib/api/calculate.service";
	import Spinner from "../common/Spinner.svelte";
	import { HttpClientError } from "../../api/http.client";
	import {
		Provider,
		CreateGenerationDtoRequest,
		type GenerationRequestDtoResponse,
		type CalculationDtoResponse,
		ResponseCode,
	} from "@api/shared";
	import { formatNumber } from "$lib/utils/number-format";
	import { authStore } from "$lib/stores/auth.store";

	interface Props {
		onCreate: (generation: GenerationRequestDtoResponse) => void;
	}

	let { onCreate }: Props = $props();

	// Step 1: input, Step 2: calc
	let step = $state<"input" | "calc">("input");
	let websiteUrl = $state("");
	let calc = $state<CalculationDtoResponse | null>(null);
	let submitting = $state(false);
	let showSpinner = $state(false);
	let error = $state<string[] | null>(null);
	let spinnerTimeout: ReturnType<typeof setTimeout> | null = null;

	const providers = [
		{
			value: Provider.OLLAMA,
			name: `Free (${Provider.OLLAMA})`,
			description: "slower",
		},
		{
			value: Provider.GEMINI,
			name: `Fast (${Provider.GEMINI})`,
			description: "faster",
		},
	];

	const isUrlValid = $derived(/^https?:\/\/.+/.test(websiteUrl));
	const canCalculate = $derived(isUrlValid && !submitting);

	const getPriceForProvider = (providerValue: Provider) => {
		if (!calc || !calc.prices) return null;
		return calc.prices.find((p) => p.provider === providerValue);
	};

	const isPaidProvider = (providerValue: Provider): boolean => {
		const price = getPriceForProvider(providerValue);
		return price != null && price.total > 0;
	};

	const requiresLogin = (providerValue: Provider): boolean => {
		return isPaidProvider(providerValue) && !$authStore.user;
	};

	const handleCalculate = async (e: Event) => {
		e.preventDefault();

		if (!canCalculate) return;

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

			// Fetch calc from API
			const response = await calculateService.calculateHost(hostname);
			calc = response.getMessage().data;

			// Move to provider selection step
			step = "calc";
		} catch (err) {
			if (
				err instanceof HttpClientError &&
				err.code === ResponseCode.INVALID
			) {
				error = err.violations;
			}

			throw err;
		} finally {
			submitting = false;
			showSpinner = false;
			if (spinnerTimeout) {
				clearTimeout(spinnerTimeout);
			}
		}
	};

	const handleProviderSelect = async (selectedProvider: Provider) => {
		if (!calc) return;

		// Check if login is required for paid provider
		if (requiresLogin(selectedProvider)) {
			const currentUrl = window.location.pathname;
			goto(`/login?redirectUrl=${encodeURIComponent(currentUrl)}`);
			return;
		}

		submitting = true;
		showSpinner = true;
		error = null;

		const response = await generationsService.create(
			new CreateGenerationDtoRequest(calc.hostname, selectedProvider),
		);

		submitting = false;
		showSpinner = false;

		onCreate(response.getMessage().data);

		// Reset form
		websiteUrl = "";
		step = "input";
		calc = null;
	};

	const handleBack = () => {
		step = "input";
		calc = null;
		error = null;
	};
</script>

<div
	class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
	<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">
		Create New Generation
	</h2>

	{#if step === "input"}
		<!-- Step 1: URL Input & Calculate -->
		<form onsubmit={handleCalculate} class="space-y-4">
			<div>
				<label
					for="url"
					class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					Website URL
				</label>
				<input
					id="url"
					type="text"
					bind:value={websiteUrl}
					disabled={submitting}
					placeholder="https://example.com"
					class="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 {!isUrlValid &&
					websiteUrl
						? 'border-red-500'
						: 'border-gray-300 dark:border-gray-600'}" />
				{#if !isUrlValid && websiteUrl}
					<p class="mt-1 text-sm text-red-600 dark:text-red-400">
						Please enter a valid URL (must start with http:// or
						https://)
					</p>
				{/if}
			</div>

			{#if error}
				<div
					class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
					<ul
						class="list-disc list-inside text-sm text-red-800 dark:text-red-200 space-y-1">
						{#each error as errMsg}
							<li>{errMsg}</li>
						{/each}
					</ul>
				</div>
			{/if}

			<button
				type="submit"
				disabled={!canCalculate}
				class="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium">
				{#if showSpinner}
					<span class="flex items-center justify-center gap-2">
						<Spinner
							size="sm"
							color="var(--spinner-color)"
							delay={1000} />
						Analyzing...
					</span>
				{:else}
					Analyze
				{/if}
			</button>
		</form>
	{:else if step === "calc" && calc}
		<!-- Step 2: Calc Display & Provider Selection -->
		<div class="space-y-6">
			<!-- Calc Display -->
			<div
				class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
				<h3
					class="text-sm font-semibold text-gray-900 dark:text-white mb-3">
					Analysis Results
				</h3>

				<div class="space-y-2 text-sm text-gray-700 dark:text-gray-300">
					<div class="flex justify-between">
						<span>Hostname:</span>
						<span
							class="font-mono text-gray-900 dark:text-white whitespace-nowrap"
							>{calc.hostname}</span>
					</div>
					<div class="flex justify-between">
						<span>URLs found:</span>
						<span
							class="font-semibold text-gray-900 dark:text-white"
							>{formatNumber(
								calc.urlsCount,
							)}{!calc.urlsCountPrecise ? "+" : ""}</span>
					</div>
				</div>
			</div>

			<!-- Provider Selection -->
			<div>
				<h3
					class="text-sm font-semibold text-gray-900 dark:text-white mb-3">
					Select Generation Method
				</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
					{#each providers as provider}
						{@const price = getPriceForProvider(provider.value)}
						<button
							type="button"
							onclick={() => handleProviderSelect(provider.value)}
							disabled={submitting}
							class="p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left">
							<div
								class="font-semibold text-gray-900 dark:text-white">
								{provider.name}
							</div>
							<div
								class="text-xs text-gray-600 dark:text-gray-400 mt-1">
								{provider.description}
							</div>
							{#if price}
								<div
									class="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-2">
									{price.currencySymbol}{price.total.toFixed(
										2,
									)}
								</div>
							{/if}
							{#if requiresLogin(provider.value)}
								<div
									class="text-xs font-medium text-amber-600 dark:text-amber-400 mt-1">
									Login required
								</div>
							{/if}
						</button>
					{/each}
				</div>
			</div>

			{#if error}
				<div
					class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
					<ul
						class="list-disc list-inside text-sm text-red-800 dark:text-red-200 space-y-1">
						{#each error as errMsg}
							<li>{errMsg}</li>
						{/each}
					</ul>
				</div>
			{/if}

			<!-- Back Button -->
			<button
				type="button"
				onclick={handleBack}
				disabled={submitting}
				class="w-full px-4 py-2.5 bg-gray-400 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-500 dark:hover:bg-gray-700 focus:ring-4 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium">
				Back
			</button>
		</div>
	{/if}
</div>
