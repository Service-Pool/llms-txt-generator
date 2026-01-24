<script lang="ts">
	import { Button } from "flowbite-svelte";
</script>

<div class="max-w-4xl mx-auto">
	<h1 class="text-3xl font-bold mb-6">About LLMs.txt Generator</h1>

	<div class="prose dark:prose-invert max-w-none">
		<p class="text-lg mb-4">
			This tool automatically generates llms.txt files for your website,
			making your content more accessible to AI language models.
		</p>

		<h2 class="text-2xl font-semibold mt-8 mb-4">Features</h2>
		<ul class="list-disc list-inside space-y-2">
			<li>Automatic sitemap parsing</li>
			<li>Content extraction and summarization</li>
			<li>Multiple AI provider support (Gemini, Ollama)</li>
			<li>Real-time progress tracking</li>
		</ul>

		<div class="mt-8">
			<Button href="/generator" size="lg">Try Generator</Button>
		</div>
	</div>
</div>
