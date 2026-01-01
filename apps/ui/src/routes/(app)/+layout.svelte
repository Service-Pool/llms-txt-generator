<script lang="ts">
	import '../../app.css';
	import Navigation from '$lib/components/common/Navigation.svelte';
</script>

<div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-x-hidden max-w-full">
	<Navigation />
	<main class="flex-1 w-full max-w-7xl mx-auto px-4 py-8">
		<slot />
	</main>
</div>
