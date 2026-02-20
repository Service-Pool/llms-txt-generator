<svelte:options runes={true} />

<script lang="ts">
	import { Card, Heading, P } from 'flowbite-svelte';
</script>

<Card
	class="max-w-none p-4 text-center bg-linear-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800"
>
	<Heading
		tag="h1"
		class="text-2xl font-bold mb-4 bg-linear-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"
	>
		LLM Ready
	</Heading>

	<P align="center">
		Generate AI-friendly documentation for your website. Create structured <code
			class="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm">llms.txt</code
		> files that help language models understand your content. Just enter your domain and let AI process your site.
	</P>
</Card>
