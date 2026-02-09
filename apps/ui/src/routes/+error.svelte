<script lang="ts">
	import { ArrowLeftOutline, HomeOutline } from 'flowbite-svelte-icons';
	import { Button, Heading } from 'flowbite-svelte';
	import { page } from '$app/state';

	const error = $derived(page.error);
	const status = $derived(page.status);
</script>

<svelte:head>
	<title>{status} - {error?.message || 'Error'}</title>
</svelte:head>

<div class="absolute inset-0 flex items-center justify-center">
	<div class="text-center max-w-md mx-auto px-4">
		<!-- Error Code -->
		<div class="mb-8">
			<span class="text-9xl font-bold text-gray-300 dark:text-gray-700 mb-4">{status}</span>
		</div>

		<!-- Error Title -->
		<Heading tag="h1" size="md" class="text-gray-600 dark:text-gray-400 mb-12">
			{error?.message || 'Something Went Wrong'}
		</Heading>

		<!-- Actions -->
		<div class="flex gap-4 justify-center items-center">
			<Button href="/" color="primary">
				<HomeOutline class="w-4 h-4 mr-2" />
				Go Home
			</Button>
			<Button color="alternative" onclick={() => window.history.back()}>
				<ArrowLeftOutline class="w-4 h-4 mr-2" />
				Go Back
			</Button>
		</div>
	</div>
</div>
