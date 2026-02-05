<script lang="ts">
	import { Heading, P, Card } from "flowbite-svelte";
</script>

<div class="max-w-4xl mx-auto">
	<div class="text-center mb-12">
		<Heading tag="h1" class="mb-4">About LLMs.txt Generator</Heading>
		<P class="text-gray-500 dark:text-gray-400">
			Learn more about our service and how it works
		</P>
	</div>

	<Card class="p-6 mb-6">
		<Heading tag="h2" class="mb-4">What is LLMs.txt?</Heading>
		<P class="mb-4 text-gray-700 dark:text-gray-300">
			LLMs.txt is a standardized format for providing context to Large
			Language Models about your website's content. It helps AI systems
			better understand and represent your website when answering
			questions or generating content.
		</P>
	</Card>

	<Card class="p-6 mb-6">
		<Heading tag="h2" class="mb-4">How It Works</Heading>
		<P class="mb-4 text-gray-700 dark:text-gray-300">
			Our service automatically crawls your website, extracts relevant
			content, and generates an optimized LLMs.txt file using advanced AI
			models. Simply provide your website URL, select a model, and
			download the result.
		</P>
	</Card>

	<Card class="p-6">
		<Heading tag="h2" class="mb-4">Privacy & Security</Heading>
		<P class="text-gray-700 dark:text-gray-300">
			We respect your privacy. Website content is processed temporarily
			and not stored permanently. All data is handled securely and in
			compliance with privacy regulations.
		</P>
	</Card>
</div>
