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
	import { Button, Input, Label, Card, Alert, Helper } from "flowbite-svelte";
	import { CheckCircleSolid } from "flowbite-svelte-icons";

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

<Card size="xl" class="shadow-sm p-4 sm:p-6 md:p-8">
	<div class="flex justify-between items-center mb-4">
		<h2 class="text-2xl font-bold">Create New Generation</h2>
		{#if step === "calc"}
			<Button
				onclick={handleBack}
				disabled={submitting}
				color="dark"
				size="xs">
				Back
			</Button>
		{/if}
	</div>

	{#if step === "input"}
		<!-- Step 1: URL Input & Calculate -->
		<form onsubmit={handleCalculate} class="space-y-4">
			<div>
				<Label for="url" class="mb-2">Website URL</Label>
				<Input
					id="url"
					type="text"
					bind:value={websiteUrl}
					disabled={submitting}
					placeholder="https://example.com"
					color={!isUrlValid && websiteUrl ? "red" : undefined} />
				{#if !isUrlValid && websiteUrl}
					<Helper color="red">
						Please enter a valid URL (must start with http:// or
						https://)
					</Helper>
				{/if}
			</div>

			{#if error}
				<Alert color="red">
					<ul class="list-disc list-inside space-y-1">
						{#each error as errMsg}
							<li>{errMsg}</li>
						{/each}
					</ul>
				</Alert>
			{/if}

			<Button type="submit" disabled={!canCalculate} class="w-full">
				{#if showSpinner}
					<span class="flex items-center justify-center gap-2">
						<Spinner size="6" color="yellow" delay={1000} />
						Analyzing...
					</span>
				{:else}
					Analyze
				{/if}
			</Button>
		</form>
	{:else if step === "calc" && calc}
		<!-- Step 2: Calc Display & Provider Selection -->
		<div class="space-y-6">
			<!-- Calc Display -->
			<Alert border color="secondary">
				<div class="space-y-3">
					<h3 class="text-sm font-semibold">Analysis Results</h3>
					<div class="space-y-2 text-sm">
						<div class="flex justify-between">
							<span>Hostname:</span>
							<span class="font-mono whitespace-nowrap"
								>{calc.hostname}</span>
						</div>
						<div class="flex justify-between">
							<span>URLs found:</span>
							<span class="font-semibold">
								{formatNumber(
									calc.urlsCount,
								)}{!calc.urlsCountPrecise ? "+" : ""}
							</span>
						</div>
					</div>
				</div>
			</Alert>

			<!-- Provider Selection -->
			<div>
				<h3 class="text-sm font-semibold mb-3">
					Select Generation Method
				</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					{#each providers as provider}
						{@const price = getPriceForProvider(provider.value)}
						<Card
							class="shadow-none max-w-none p-4 h-full flex flex-col relative overflow-hidden">
							<div
								class="absolute inset-0 opacity-10"
								style="background-image: url('/pattern.svg'); background-size: cover; background-repeat: repeat;">
							</div>

							<h5 class="mb-2 text-lg font-medium relative z-10">
								{provider.name}
							</h5>

							{#if price && price.total > 0}
								<div
									class="flex items-baseline mb-4 relative z-10">
									<span class="text-2xl font-semibold">
										{price.currencySymbol}
									</span>
									<span
										class="text-4xl font-extrabold tracking-tight">
										{price.total.toFixed(2)}
									</span>
								</div>
							{:else}
								<div
									class="mb-4 text-3xl font-bold relative z-10">
									Free
								</div>
							{/if}

							<ul class="mb-4 space-y-2 relative z-10">
								<li class="flex items-center space-x-2">
									<CheckCircleSolid
										class="text-primary-600 h-4 w-4 shrink-0" />
									<span class="text-sm opacity-75">
										{provider.description}
									</span>
								</li>
								{#if requiresLogin(provider.value)}
									<li class="flex items-center space-x-2">
										<CheckCircleSolid
											class="text-amber-600 h-4 w-4 shrink-0" />
										<span class="text-sm text-amber-600">
											Login required
										</span>
									</li>
								{/if}
							</ul>

							<Button
								onclick={() =>
									handleProviderSelect(provider.value)}
								disabled={submitting}
								class="mt-auto self-start relative z-10">
								Queue
							</Button>
						</Card>
					{/each}
				</div>
			</div>

			{#if error}
				<Alert color="red">
					<ul class="list-disc list-inside space-y-1">
						{#each error as errMsg}
							<li>{errMsg}</li>
						{/each}
					</ul>
				</Alert>
			{/if}
		</div>
	{/if}
</Card>
