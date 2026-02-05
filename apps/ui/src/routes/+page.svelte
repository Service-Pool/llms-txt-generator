<svelte:options runes={true} />

<script lang="ts">
	import { Heading, P, Card, Button } from "flowbite-svelte";
	import { configService } from "$lib/services/config.service";
</script>

<div class="max-w-6xl mx-auto">
	<!-- Hero Section -->
	<div class="text-center mb-16 mt-8">
		<Heading tag="h1" class="mb-6 text-5xl">LLMs.txt Generator</Heading>
		<P class="text-xl text-gray-600 dark:text-gray-300 mb-8">
			Create AI-optimized content files from your website automatically
		</P>
		<div class="flex gap-4 justify-center">
			<Button
				href={configService.routes.orders}
				size="lg"
				color="primary">Start Generating</Button>
			<Button href={configService.routes.about} size="lg" color="light"
				>Learn More</Button>
		</div>
	</div>

	<!-- Features -->
	<div class="grid md:grid-cols-3 gap-8 mb-16">
		<Card class="p-6 text-center">
			<div class="mb-4 text-4xl">🚀</div>
			<Heading tag="h3" class="mb-3">Fast Processing</Heading>
			<P class="text-gray-600 dark:text-gray-400">
				Generate optimized LLMs.txt files in minutes using advanced AI
				models
			</P>
		</Card>
		<Card class="p-6 text-center">
			<div class="mb-4 text-4xl">🤖</div>
			<Heading tag="h3" class="mb-3">AI-Powered</Heading>
			<P class="text-gray-600 dark:text-gray-400">
				Multiple AI models to choose from for best results
			</P>
		</Card>
		<Card class="p-6 text-center">
			<div class="mb-4 text-4xl">🔒</div>
			<Heading tag="h3" class="mb-3">Secure & Private</Heading>
			<P class="text-gray-600 dark:text-gray-400">
				Your data is processed securely and not stored permanently
			</P>
		</Card>
	</div>

	<!-- How It Works -->
	<div class="mb-16">
		<Heading tag="h2" class="mb-8 text-center text-3xl"
			>How It Works</Heading>
		<div class="grid md:grid-cols-3 gap-6">
			<Card class="p-6">
				<Heading tag="h3" class="mb-2">1. Enter URL</Heading>
				<P class="text-gray-600 dark:text-gray-400">
					Provide the website URL you want to process
				</P>
			</Card>
			<Card class="p-6">
				<Heading tag="h3" class="mb-2">2. Select Model</Heading>
				<P class="text-gray-600 dark:text-gray-400">
					Choose from available AI models and pay for generation
				</P>
			</Card>
			<Card class="p-6">
				<Heading tag="h3" class="mb-2">3. Download Result</Heading>
				<P class="text-gray-600 dark:text-gray-400">
					Get your optimized LLMs.txt file ready to use
				</P>
			</Card>
		</div>
	</div>

	<!-- CTA -->
	<Card class="p-8 text-center bg-primary-50 dark:bg-gray-800">
		<Heading tag="h2" class="mb-4">Ready to get started?</Heading>
		<P class="mb-6 text-gray-600 dark:text-gray-400">
			Generate your first LLMs.txt file today
		</P>
		<Button
			href={configService.routes.orders}
			size="lg"
			color="primary">Generate Now</Button>
	</Card>
</div>
