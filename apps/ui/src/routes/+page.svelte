<svelte:options runes={true} />

<script lang="ts">
	import { onMount } from 'svelte';
	import { configService } from '$lib/services/config.service';
	import { aiModelsService } from '$lib/services/ai-models.service';
	import { formatNumber } from '$lib/utils/number-format';
	import Hero from '$lib/components/layout/hero.svelte';
	import NewOrderForm from '$lib/components/order/NewOrderForm.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import { Card, Heading, P, Badge, Spinner, Accordion, AccordionItem } from 'flowbite-svelte';
	import {
		CheckCircleSolid,
		RocketSolid,
		GlobeSolid,
		StarSolid,
		ShieldCheckSolid,
		FileLinesOutline,
		LinkOutline
	} from 'flowbite-svelte-icons';
	import type { AiModelResponseDto } from '@api/shared';

	let models = $state<AiModelResponseDto[]>([]);
	let isLoadingModels = $state(true);
	let gistFiles = $state<Array<{ gistname: string; content: string; urlCount: number; estimatedMinutes: number }>>([]);

	const freeModels = $derived(models.filter((m) => m.baseRate === 0));
	const paidModels = $derived(models.filter((m) => m.baseRate > 0));

	onMount(async () => {
		// Load AI models
		try {
			const response = await aiModelsService.getAll();
			models = response.getData();
		} catch (exception) {
			throw exception;
		} finally {
			isLoadingModels = false;
		}

		// Load Gist content from metadata
		const metadata = await fetch('/gists/metadata.json').then((r) => r.json());
		gistFiles = await Promise.all(
			metadata.files.map(
				async (file: { gistname: string; path: string; urlCount: number; estimatedMinutes: number }) => {
					const content = await fetch(file.path).then((r) => r.text());
					return {
						gistname: file.gistname,
						content,
						urlCount: file.urlCount,
						estimatedMinutes: file.estimatedMinutes
					};
				}
			)
		);
	});

	function handleAnchorClick() {
		window.location.hash = 'example-output';
	}
</script>

<SEO
	title={configService.seo.pageTitle('AI-Powered Content Optimization')}
	description="Generate optimized LLMs.txt files for your website with AI-powered content processing. Improve how AI models understand and index your content."
/>

<svelte:head>
	<!-- Structured Data -->
	<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "WebApplication",
			"name": "LLMs.txt Generator",
			"description": "AI-powered service for generating optimized LLMs.txt files from website content",
			"url": "/",
			"applicationCategory": "DeveloperApplication",
			"operatingSystem": "Web Browser",
			"offers": {
				"@type": "Offer",
				"price": "0",
				"priceCurrency": "USD",
				"description": "Free LLMs.txt file generation"
			},
			"creator": {
				"@type": "Organization",
				"name": "LLMs.txt Generator"
			},
			"featureList": [
				"Automatic website crawling",
				"AI-powered content processing",
				"Multiple AI model support",
				"SEO optimization",
				"Fast generation"
			]
		}
	</script>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-6">
	<Hero />
	<NewOrderForm />

	<!-- SEO Content Section -->
	<section class="mt-16 space-y-8">
		<!-- Hero Section -->
		<div class="text-center mb-12">
			<Heading
				tag="h2"
				class="text-3xl md:text-4xl font-bold mb-4 bg-linear-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"
			>
				Free LLMs.txt Generator with AI
			</Heading>
			<P class="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
				Generate optimized LLMs.txt files for your website using advanced AI language models. Fast, efficient, and
				SEO-friendly content generation.
			</P>
		</div>

		<!-- Available Models Section -->
		<Card
			class="max-w-none p-4 bg-linear-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800"
		>
			<div class="flex items-start gap-4">
				<RocketSolid class="w-8 h-8 text-purple-600 dark:text-purple-400" />
				<Heading tag="h3" class="text-xl font-bold mb-4 text-gray-900 dark:text-white">Available AI Models</Heading>
			</div>
			<div>
				{#if isLoadingModels}
					<div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
						<Spinner size="4" />
						<span>Loading available AI models...</span>
					</div>
				{:else if models.length > 0}
					<div class="space-y-4">
						{#if freeModels.length > 0}
							<div class="bg-white/50 dark:bg-gray-800/50 rounded border p-4">
								<div class="flex items-center gap-2 mb-2">
									<Badge color="green" class="text-sm">FREE</Badge>
									<StarSolid class="w-4 h-4 text-green-600 dark:text-green-400" />
								</div>
								<P class="text-sm mb-2">
									<strong>Free Tier Models:</strong>
									{#each freeModels as model, i}
										<span class="text-purple-700 dark:text-purple-300">{model.displayName}</span>
										{#if model.pageLimit}
											<Badge color="gray">up to {formatNumber(model.pageLimit)} pages</Badge>
										{/if}
										{i < freeModels.length - 1 ? ', ' : ''}
									{/each}
								</P>
								<P class="text-xs text-gray-600 dark:text-gray-400">
									Perfect for blogs, portfolios, and small business websites
								</P>
							</div>
						{/if}

						{#if paidModels.length > 0}
							<div class="bg-white/50 dark:bg-gray-800/50 rounded border p-4">
								<div class="flex items-center gap-2 mb-2">
									<Badge color="purple" class="text-sm">STABLE</Badge>
									<RocketSolid class="w-4 h-4 text-purple-600 dark:text-purple-400" />
								</div>
								<P class="text-sm mb-2">
									<strong>Stable Models:</strong>
									{#each paidModels as model, i}
										<span class="text-purple-700 dark:text-purple-300">{model.displayName}</span>{i <
										paidModels.length - 1
											? ', '
											: ''}
									{/each}
								</P>
								<P class="text-xs text-gray-600 dark:text-gray-400">
									Unlimited page processing for large websites, documentation, and e-commerce platforms
								</P>
							</div>
						{/if}
					</div>
				{:else}
					<P class="text-gray-600 dark:text-gray-400">
						Choose from free and premium AI models for llms.txt generation - options for every website size and budget
					</P>
				{/if}
			</div>
		</Card>

		<!-- Key Features Grid -->
		<div class="grid md:grid-cols-2 gap-6">
			<Card class="max-w-none select-none p-6 hover:shadow-lg transition-shadow">
				<div class="flex items-start gap-3">
					<CheckCircleSolid class="w-6 h-6 text-green-600 dark:text-green-400 shrink-0 mt-1" />
					<div>
						<Heading tag="h4" class="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
							AI-Powered Generation
						</Heading>
						<P class="text-sm text-gray-600 dark:text-gray-400">
							Generate llms.txt files using advanced AI language models. Our free generator creates AI-optimized content
							summaries without requiring registration or credit card for free tier. Perfect for websites of all sizes
							with automatic page detection and intelligent content extraction.
						</P>
					</div>
				</div>
			</Card>

			<Card class="max-w-none select-none p-6 hover:shadow-lg transition-shadow">
				<div class="flex items-start gap-3">
					<GlobeSolid class="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0 mt-1" />
					<div>
						<Heading tag="h4" class="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
							Automatic Website Crawler
						</Heading>
						<P class="text-sm text-gray-600 dark:text-gray-400">
							Our intelligent crawler extracts all website pages automatically with smart content detection. No manual
							work required - just enter your URL and let AI process your entire site structure and content.
						</P>
					</div>
				</div>
			</Card>

			<Card class="max-w-none select-none p-6 hover:shadow-lg transition-shadow">
				<div class="flex items-start gap-3">
					<RocketSolid class="w-6 h-6 text-yellow-600 dark:text-yellow-400 shrink-0 mt-1" />
					<div>
						<Heading tag="h4" class="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Fast Generation</Heading>
						<P class="text-sm text-gray-600 dark:text-gray-400">
							Create optimized llms.txt files in minutes with advanced AI processing technology. Transparent pricing,
							instant generation, and no hidden costs. Choose the model that best fits your needs.
						</P>
					</div>
				</div>
			</Card>

			<Card class="max-w-none select-none p-6 hover:shadow-lg transition-shadow">
				<div class="flex items-start gap-3">
					<CheckCircleSolid class="w-6 h-6 text-purple-600 dark:text-purple-400 shrink-0 mt-1" />
					<div>
						<Heading tag="h4" class="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
							SEO for AI Search
						</Heading>
						<P class="text-sm text-gray-600 dark:text-gray-400">
							Improve website visibility in ChatGPT, Claude, Gemini, Perplexity, and all LLM-powered search engines.
							Essential for ranking in AI-generated search results and chatbot recommendations.
						</P>
					</div>
				</div>
			</Card>
		</div>

		<!-- What is LLMs.txt Section -->
		<Card
			class="max-w-none p-6 bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800"
		>
			<Heading tag="h3" class="text-2xl font-bold mb-8 text-gray-900 dark:text-white text-center">
				What is LLMs.txt and Why Generate It?
			</Heading>

			<div class="grid md:grid-cols-3 gap-6">
				<div class="bg-white/70 dark:bg-gray-800/70 rounded p-4">
					<div class="flex items-center gap-2 mb-3">
						<ShieldCheckSolid class="w-5 h-5 text-blue-600 dark:text-blue-400" />
						<Heading tag="h4" class="text-base font-semibold text-gray-900 dark:text-white">Standard Format</Heading>
					</div>
					<P class="text-sm text-gray-600 dark:text-gray-400">
						LLMs.txt is a standardized Markdown file format created by AnswerAI that helps Large Language Models like
						ChatGPT, Claude AI, Google Gemini, Perplexity AI better understand website content. Our generator creates
						perfectly formatted files that follow official llms-txt specification standards.
					</P>
				</div>

				<div class="bg-white/70 dark:bg-gray-800/70 rounded p-4">
					<div class="flex items-center gap-2 mb-3">
						<RocketSolid class="w-5 h-5 text-purple-600 dark:text-purple-400" />
						<Heading tag="h4" class="text-base font-semibold text-gray-900 dark:text-white">AI Optimization</Heading>
					</div>
					<P class="text-sm text-gray-600 dark:text-gray-400">
						Provide essential context that helps ChatGPT, Claude, Gemini, Perplexity, and other LLMs accurately
						represent your content in AI-generated responses. Enhance website discoverability in AI searches and chatbot
						conversations.
					</P>
				</div>

				<div class="bg-white/70 dark:bg-gray-800/70 rounded p-4">
					<div class="flex items-center gap-2 mb-3">
						<CheckCircleSolid class="w-5 h-5 text-green-600 dark:text-green-400" />
						<Heading tag="h4" class="text-base font-semibold text-gray-900 dark:text-white">SEO for AI Era</Heading>
					</div>
					<P class="text-sm text-gray-600 dark:text-gray-400">
						Improve rankings in AI-powered search results including ChatGPT search, Perplexity AI, Google AI Overviews,
						Bing Copilot. Essential for ensuring your site appears in LLM responses and AI chatbot recommendations.
					</P>
				</div>
			</div>
		</Card>

		<!-- How to Generate Section -->
		<Card class="max-w-none p-8">
			<Heading tag="h3" class="text-2xl font-bold mb-6 text-gray-900 dark:text-white">How to Generate LLMs.txt</Heading>

			<div class="space-y-6">
				<div class="flex gap-4">
					<div class="shrink-0">
						<div class="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
							<GlobeSolid class="w-5 h-5 text-purple-600 dark:text-purple-400" />
						</div>
					</div>
					<div class="flex-1 pt-1">
						<Heading tag="h4" class="text-base font-semibold mb-2 text-gray-900 dark:text-white">
							Enter Your Website URL
						</Heading>
						<P class="text-sm text-gray-600 dark:text-gray-400">
							Enter your website URL into our free llms.txt generator tool. Our AI-powered crawler will automatically
							discover and process all pages on your site using advanced language models.
						</P>
					</div>
				</div>

				<div class="flex gap-4">
					<div class="shrink-0">
						<div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
							<StarSolid class="w-5 h-5 text-blue-600 dark:text-blue-400" />
						</div>
					</div>
					<div class="flex-1 pt-1">
						<Heading tag="h4" class="text-base font-semibold mb-2 text-gray-900 dark:text-white">
							Select AI Model
						</Heading>
						<P class="text-sm text-gray-600 dark:text-gray-400">
							Choose AI model based on your website size. Our generator shows available options including free tier
							models and premium models for unlimited processing. Pick what fits your needs and budget.
						</P>
					</div>
				</div>

				<div class="flex gap-4">
					<div class="shrink-0">
						<div class="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
							<RocketSolid class="w-5 h-5 text-green-600 dark:text-green-400" />
						</div>
					</div>
					<div class="flex-1 pt-1">
						<Heading tag="h4" class="text-base font-semibold mb-2 text-gray-900 dark:text-white">
							Process & Generate
						</Heading>
						<P class="text-sm text-gray-600 dark:text-gray-400">
							Click generate and wait while our AI processes your website content. Processing typically completes in
							2-10 minutes with intelligent content extraction and optimization.
						</P>
					</div>
				</div>

				<div class="flex gap-4">
					<div class="shrink-0">
						<div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
							<CheckCircleSolid class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
						</div>
					</div>
					<div class="flex-1 pt-1">
						<Heading tag="h4" class="text-base font-semibold mb-2 text-gray-900 dark:text-white">
							Download & Deploy
						</Heading>
						<P class="text-sm text-gray-600 dark:text-gray-400">
							Download your generated llms.txt file and place it in your website root directory. Your file is now ready
							to help LLMs like ChatGPT, Claude, Gemini, and Perplexity better understand your content.
						</P>
					</div>
				</div>
			</div>
		</Card>

		<!-- Example Output Section -->
		<div id="example-output">
			<div class="flex items-center gap-2 mb-4">
				<button onclick={handleAnchorClick}>
					<LinkOutline class="w-5 h-5 text-green-600 dark:text-green-400" />
				</button>
				<Heading tag="h3" class="text-2xl font-bold text-gray-900 dark:text-white">
					Example Generated LLMs.txt File
				</Heading>
			</div>

			<!-- Stats -->
			{#if gistFiles.length > 0}
				<Accordion class="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
					{#each gistFiles as file}
						<AccordionItem classes={{ button: 'relative z-10', content: 'p-0' }} transitionParams={{ duration: 400 }}>
							{#snippet header()}
								<div class="flex flex-col gap-2">
									<div class="flex items-center gap-2">
										<FileLinesOutline class="w-5 h-5 text-green-600 dark:text-green-400" />
										<span class="font-semibold text-gray-900 dark:text-white">{file.gistname}</span>
									</div>
									<div class="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
										<span>{formatNumber(file.urlCount)} URLs</span>
										<span>•</span>
										<span>{file.estimatedMinutes} min</span>
									</div>
								</div>
							{/snippet}
							<pre
								class="m-0 p-4 bg-white dark:bg-[#161b22] overflow-x-auto font-mono text-sm leading-6 text-gray-900 dark:text-gray-300 max-h-125 overflow-y-auto"><code
									class="bg-transparent p-0 border-0">{file.content}</code
								></pre>
						</AccordionItem>
					{/each}
				</Accordion>
			{:else}
				<div class="flex items-center justify-center gap-2 py-8 text-gray-600 dark:text-gray-400">
					<Spinner size="4" />
					<span>Loading example...</span>
				</div>
			{/if}
		</div>

		<!-- Keywords and Industries (Collapsed by default for SEO) -->
		<details class="group">
			<summary class="cursor-pointer list-none">
				<Card class="max-w-none p-6 hover:shadow-lg transition-shadow">
					<div class="flex items-center justify-between">
						<Heading tag="h3" class="text-xl font-bold text-gray-900 dark:text-white">
							Supported Models, Website Types & Industries
						</Heading>
						<svg
							class="w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform group-open:rotate-180"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</div>
				</Card>
			</summary>

			<Card class="max-w-none p-4 mt-4">
				<div class="space-y-4 text-sm text-gray-600 dark:text-gray-400">
					<div>
						<Heading tag="h4" class="text-base font-semibold mb-2 text-gray-900 dark:text-white">
							AI Models for LLMs.txt Generation
						</Heading>
						<P class="text-sm">
							Multiple advanced Large Language Models available including free tier options and premium unlimited
							models. Compatible with ChatGPT, Claude AI, Google Gemini, Perplexity AI, Microsoft Copilot, and all major
							LLM platforms. Generated files work seamlessly with OpenAI GPT models, Anthropic Claude, Google Gemini,
							and emerging AI search engines.
						</P>
					</div>

					<div>
						<Heading tag="h4" class="text-base font-semibold mb-2 text-gray-900 dark:text-white">
							Supported Website Types
						</Heading>
						<P class="text-sm">
							Corporate websites, business sites, e-commerce stores, online shops, SaaS platforms, documentation sites,
							API docs, knowledge bases, blogs, news sites, magazines, portfolio sites, personal websites, educational
							platforms, universities, research sites, healthcare websites, medical portals, financial sites, banking
							platforms, real estate websites, property listings, restaurant sites, hospitality websites, nonprofit
							organizations, government sites, and any web content requiring AI optimization.
						</P>
					</div>

					<div>
						<Heading tag="h4" class="text-base font-semibold mb-2 text-gray-900 dark:text-white">
							Industries Using LLMs.txt
						</Heading>
						<P class="text-sm">
							Technology companies, software development, SaaS, fintech, healthcare, medical, pharmaceuticals,
							education, e-learning, marketing agencies, consulting firms, law firms, accounting, real estate,
							hospitality, retail, e-commerce, manufacturing, logistics, media, publishing, entertainment, gaming,
							sports, fitness, food and beverage, automotive, construction, architecture, design, fashion, beauty,
							travel, tourism, insurance, banking, finance, telecommunications, energy, utilities, agriculture, and
							more.
						</P>
					</div>

					<div>
						<Heading tag="h4" class="text-base font-semibold mb-2 text-gray-900 dark:text-white">Keywords</Heading>
						<P class="text-sm">
							llms.txt generator, llmstxt generator, llms txt generator, generate llms.txt, generate llmstxt, free
							llms.txt generator, free llms txt generator, online llms.txt tool, create llms.txt file, llms.txt file
							generator, AI content optimization, Large Language Model optimization, ChatGPT optimization, Claude AI
							optimization, Gemini optimization, Perplexity optimization, SEO for AI, AI search optimization, website AI
							optimization, llms-txt standard, llmstxt format, LLM content processing, AI-powered generator, free AI
							tool, best llms.txt generator, AI SEO tool.
						</P>
					</div>
				</div>
			</Card>
		</details>
	</section>
</div>
