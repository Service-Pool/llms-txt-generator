<script lang="ts">
	import { page } from "$app/state";
	import { Button, Heading } from "flowbite-svelte";
	import { ArrowLeftOutline, HomeOutline } from "flowbite-svelte-icons";

	const error = $derived(page.error);
	const status = $derived(page.status);
</script>

<svelte:head>
	<title>{status} - {error?.message || "Error"}</title>
</svelte:head>

<div class="flex flex-1 items-center justify-center">
	<div class="text-center max-w-md mx-auto px-4">
		<!-- Error Code -->
		<div class="mb-8">
			<span
				class="text-8xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-primary-600 to-primary-400">
				{status}
			</span>
		</div>

		<!-- Error Title -->
		<Heading tag="h1" class="mb-12">
			{error?.message || "Something Went Wrong"}
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
