<script lang="ts">
	import Hero from '$lib/components/layout/hero.svelte';
	import NewOrderForm from '$lib/components/order/NewOrderForm.svelte';
</script>

<svelte:head>
	<title>New Order - LLMs.txt Generator</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-6">
	<Hero />
	<NewOrderForm />

	<!-- SEO Content Section -->
	<section class="mt-16 space-y-8 text-gray-700 dark:text-gray-300">
		<div class="border-t border-gray-200 dark:border-gray-700 pt-8">
			<h2 class="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">About LLMs.txt Generator</h2>

			<div class="grid md:grid-cols-2 gap-8">
				<div>
					<h3 class="text-lg font-medium mb-3 text-gray-900 dark:text-white">What is LLMs.txt?</h3>
					<p class="mb-4">
						LLMs.txt is a standardized format that helps Large Language Models better understand your website content.
						Our AI-powered generator creates optimized LLMs.txt files that improve how AI systems interpret and
						represent your web content.
					</p>
					<p>
						Generate LLMs.txt files automatically using advanced crawling technology and AI model processing. Perfect
						for websites, blogs, documentation sites, and any web content that needs better AI understanding.
					</p>
				</div>

				<div>
					<h3 class="text-lg font-medium mb-3 text-gray-900 dark:text-white">Why Choose Our Generator?</h3>
					<ul class="space-y-2 list-disc list-outside ml-6">
						<li><strong>AI-Powered Processing:</strong> Advanced language models optimize content structure</li>
						<li><strong>Automatic Website Crawling:</strong> No manual content extraction needed</li>
						<li><strong>Multiple AI Models:</strong> Choose from various LLM providers and models</li>
						<li><strong>Fast Generation:</strong> From URL to LLMs.txt in minutes</li>
						<li><strong>SEO Friendly:</strong> Improves AI search engine understanding</li>
					</ul>
				</div>
			</div>
		</div>

		<div class="border-t border-gray-200 dark:border-gray-700 pt-8">
			<h3 class="text-lg font-medium mb-4 text-gray-900 dark:text-white">How LLMs.txt Improves AI Understanding</h3>
			<div class="grid md:grid-cols-3 gap-6">
				<div>
					<h4 class="font-medium mb-2">Content Structure</h4>
					<p class="text-sm">
						Organizes website content in a format that Large Language Models can easily parse and understand, improving
						accuracy when AI systems reference your site.
					</p>
				</div>
				<div>
					<h4 class="font-medium mb-2">Context Optimization</h4>
					<p class="text-sm">
						Provides essential context and metadata that helps AI models better represent your content when generating
						responses or summaries.
					</p>
				</div>
				<div>
					<h4 class="font-medium mb-2">Search Enhancement</h4>
					<p class="text-sm">
						Enhances your website's visibility in AI-powered search engines and chatbot responses, improving digital
						discoverability.
					</p>
				</div>
			</div>
		</div>

		<div class="border-t border-gray-200 dark:border-gray-700 pt-8">
			<h3 class="text-lg font-medium mb-4 text-gray-900 dark:text-white">Supported Platforms & Use Cases</h3>
			<div class="text-sm space-y-2">
				<p>
					<strong>Website Types:</strong> Corporate websites, blogs, e-commerce stores, documentation sites, portfolios, news
					sites, educational platforms
				</p>
				<p>
					<strong>AI Models:</strong> Compatible with OpenAI GPT models, Anthropic Claude, Google Gemini, and other major
					LLM providers
				</p>
				<p>
					<strong>Industries:</strong> Technology, marketing, education, healthcare, finance, retail, consulting, and more
				</p>
				<p>
					<strong>File Formats:</strong> Generates clean, structured LLMs.txt files that follow industry standards and best
					practices
				</p>
			</div>
		</div>
	</section>
</div>
