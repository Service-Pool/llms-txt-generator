<script lang="ts">
	import { configService } from '$lib/services/config.service';
	import ContactForm from '$lib/components/ContactForm.svelte';
	import SEO from '$lib/components/SEO.svelte';

	const workerUrl = configService.contactWorker.url;
</script>

<SEO
	title={configService.seo.pageTitle('Contact Us')}
	description="Get in touch with us for questions, feedback, or support regarding LLMs.txt Generator."
/>

<div class="container mx-auto px-4 py-8">
	<div class="text-center mb-8">
		<h1 class="text-4xl font-bold mb-4 dark:text-white">Contact Us</h1>
		<p class="text-lg text-gray-600 dark:text-gray-400">Have questions or feedback? We'd love to hear from you!</p>
	</div>

	<ContactForm {workerUrl} class="max-w-none" />

	<div class="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
		<p>We typically respond within 24-48 hours.</p>
	</div>
</div>
