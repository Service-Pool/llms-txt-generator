<script lang="ts">
	import '../../app.css';
	import Navigation from '$lib/components/common/Navigation.svelte';
</script>

<div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
	<Navigation />
	<main class="flex-1 container mx-auto px-4 py-8 max-w-7xl">
		<slot />
	</main>
</div>
