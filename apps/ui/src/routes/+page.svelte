<svelte:options runes={true} />

<script lang="ts">
	import Hero from '$lib/components/general/Hero.svelte';
	import { Button } from 'flowbite-svelte';
	import { configService } from '$lib/services/config.service';
</script>

<div class="max-w-6xl mx-auto">
	<Hero />
	<div class="text-center mb-16 mt-8">
		<div class="flex gap-4 justify-center">
			<Button href={configService.routes.orders} size="lg" color="primary">Start Generating</Button>
			<Button href={configService.routes.about} size="lg" color="light">Learn More</Button>
		</div>
	</div>
</div>
