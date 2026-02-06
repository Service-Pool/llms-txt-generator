<script lang="ts">
	import { Button, Select, Label, Helper } from 'flowbite-svelte';
	import { ChartMixedDollarSolid, CashSolid, FireSolid, DownloadSolid } from 'flowbite-svelte-icons';
	import { ordersService } from '$lib/services/orders.service';
	import type { OrderResponseDto, AvailableAiModelDto } from '@api/shared';

	interface Props {
		order: OrderResponseDto;
		onUpdate?: () => void;
	}

	let { order, onUpdate }: Props = $props();

	let availableModels = $state<AvailableAiModelDto[]>([]);
	let isLoadingModels = $state(false);
	let selectedModelId = $state<number | null>(null);
	let isCalculating = $state(false);
	let isPaying = $state(false);
	let isRunning = $state(false);

	const modelOptions = $derived(
		availableModels.map((model) => ({
			value: model.id,
			name: `${model.displayName} - ${model.currencySymbol}${model.totalPrice.toFixed(2)}`
		}))
	);

	// Load available models when component mounts
	$effect(() => {
		if (hasAction('calculate') && availableModels.length === 0) {
			loadAvailableModels();
		}
	});

	const loadAvailableModels = async () => {
		isLoadingModels = true;
		try {
			const response = await ordersService.getAvailableModels(order.id);
			const data = response.getData();
			if (data) {
				availableModels = data;
			}
		} catch (error) {
			console.error('Failed to load models:', error);
		} finally {
			isLoadingModels = false;
		}
	};

	const handleCalculate = async () => {
		if (!selectedModelId) return;
		isCalculating = true;
		try {
			// TODO: Implement calculate API call
			console.log('Calculate with model:', selectedModelId);
			onUpdate?.();
		} catch (error) {
			console.error('Calculate failed:', error);
		} finally {
			isCalculating = false;
		}
	};

	const handlePay = async () => {
		isPaying = true;
		try {
			// TODO: Implement payment flow (Stripe checkout)
			console.log('Initiate payment');
			onUpdate?.();
		} catch (error) {
			console.error('Payment failed:', error);
		} finally {
			isPaying = false;
		}
	};

	const handleRun = async () => {
		isRunning = true;
		try {
			// TODO: Implement run API call
			console.log('Start processing');
			onUpdate?.();
		} catch (error) {
			console.error('Run failed:', error);
		} finally {
			isRunning = false;
		}
	};

	const handleDownload = async () => {
		try {
			const blob = await ordersService.download(order.id);
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			const domain = new URL(order.hostname).hostname;
			a.download = `llms-${domain}.txt`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (error) {
			console.error('Download failed:', error);
		}
	};

	const hasAction = (action: string) => ordersService.hasAction(order, action);
</script>

<div class="space-y-4">
	<!-- Calculate Price Action -->
	{#if hasAction('calculate')}
		<div class="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
			<div class="flex items-start gap-4">
				<div class="flex-1">
					<Label class="mb-2">
						<ChartMixedDollarSolid class="w-4 h-4 inline me-2 text-purple-600 dark:text-purple-400" />
						Select AI Model to Calculate Price
					</Label>
					{#if isLoadingModels}
						<p class="text-sm text-gray-500">Loading models...</p>
					{:else}
						<Select bind:value={selectedModelId} items={modelOptions} placeholder="Choose a model..." />
						{#if selectedModelId}
							<Helper class="mt-2 text-xs">
								Price will be calculated based on {order.totalUrls} URLs
							</Helper>
						{/if}
					{/if}
				</div>
				<Button color="purple" disabled={!selectedModelId || isCalculating} onclick={handleCalculate} class="mt-7">
					{isCalculating ? 'Calculating...' : 'Calculate'}
				</Button>
			</div>
		</div>
	{/if}

	<!-- Payment Action -->
	{#if hasAction('checkout') || hasAction('paymentIntent')}
		<div class="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
			<div class="flex items-center justify-between">
				<div>
					<div class="font-semibold text-gray-900 dark:text-white">
						<CashSolid class="w-4 h-4 inline me-2 text-green-600 dark:text-green-400" />
						Payment Required
					</div>
					<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
						Total: <span class="font-semibold">{order.currencySymbol}{order.priceTotal?.toFixed(2)}</span>
					</p>
				</div>
				<Button color="green" disabled={isPaying} onclick={handlePay}>
					{isPaying ? 'Processing...' : 'Checkout & Pay'}
				</Button>
			</div>
		</div>
	{/if}

	<!-- Run Processing Action -->
	{#if hasAction('run')}
		<div class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
			<div class="flex items-center justify-between">
				<div>
					<div class="font-semibold text-gray-900 dark:text-white">
						<FireSolid class="w-4 h-4 inline me-2 text-red-600 dark:text-red-400" />
						Ready to Process
					</div>
					<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Start generating LLMs.txt file</p>
				</div>
				<Button color="red" disabled={isRunning} onclick={handleRun}>
					{isRunning ? 'Starting...' : 'Start Processing'}
				</Button>
			</div>
		</div>
	{/if}

	<!-- Download Action -->
	{#if hasAction('download')}
		<div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
			<div class="flex items-center justify-between">
				<div>
					<div class="font-semibold text-gray-900 dark:text-white">
						<DownloadSolid class="w-4 h-4 inline me-2 text-blue-600 dark:text-blue-400" />
						File Ready
					</div>
					<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Your LLMs.txt file is ready to download</p>
				</div>
				<Button color="blue" onclick={handleDownload}>Download Result</Button>
			</div>
		</div>
	{/if}

	<!-- No Actions Available -->
	{#if !hasAction('calculate') && !hasAction('checkout') && !hasAction('paymentIntent') && !hasAction('run') && !hasAction('download')}
		<p class="text-gray-500 dark:text-gray-400 text-center py-4">No actions available for this order at the moment.</p>
	{/if}
</div>
