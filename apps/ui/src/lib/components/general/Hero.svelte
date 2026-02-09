<svelte:options runes={true} />

<script lang="ts">
	import { Card, Heading } from 'flowbite-svelte';
	import { GlobeOutline } from 'flowbite-svelte-icons';
</script>

<Card
	class="max-w-none py-4 text-center bg-linear-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800"
>
	<Heading
		tag="h1"
		class="text-3xl font-bold mb-4 bg-linear-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"
	>
		LLMs.txt Generator
	</Heading>

	<p class="text-lg text-gray-700 dark:text-gray-300 mb-3 max-w-2xl mx-auto">
		Generate AI-friendly documentation for your website. Create structured <code
			class="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm">llms.txt</code
		> files that help language models understand your content.
	</p>

	<div class="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
		<GlobeOutline />
		<span>Simply enter your domain and let AI process your site</span>
	</div>
</Card>
