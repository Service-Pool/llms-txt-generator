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
</div>
