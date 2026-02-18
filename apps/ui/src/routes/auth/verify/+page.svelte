<script lang="ts">
	import { authService } from '$lib/services/auth.service';
	import { authStore } from '$lib/stores/auth.store.svelte';
	import { Card, Heading, P, Button, Spinner } from 'flowbite-svelte';
	import { configService } from '$lib/services/config.service';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import DelayedRender from '$lib/components/ui/delayed-render.svelte';
	import ErrorList from '$lib/components/ui/error-list.svelte';

	import { CheckCircleSolid, ExclamationCircleSolid } from 'flowbite-svelte-icons';

	let loading = $state(true);
	let error = $state<string[] | string | null>(null);
	let success = $state(false);

	onMount(async () => {
		try {
			const crd = page.url.searchParams.get('crd');

			if (!crd) {
				loading = false;
				throw new Error('Invalid login link');
			}

			const res = await authService.login(crd);
			const data = res.getData();

			authStore.setUser(data.attributes.user);
			success = true;

			// Куда редиректить: сначала параметр target, потом redirectUrl из API, потом главная
			const targetUrl = page.url.searchParams.get('target') || '/';

			setTimeout(() => {
				goto(targetUrl);
			}, 1500);
		} catch (exception) {
			if (exception instanceof Error) {
				error = exception.message;
			}

			throw exception;
		} finally {
			loading = false;
		}
	});
</script>

<div class="max-w-xl mx-auto mt-20">
	<Card size="xl" class="py-10 px-20 text-center">
		{#if loading}
			<div class="flex flex-col items-center gap-4">
				<DelayedRender>
					<Spinner size="12" color="blue" />
				</DelayedRender>
				<P size="lg">Verifying your login link...</P>
			</div>
		{:else if success}
			<div class="flex flex-col items-center gap-4 text-green-600 dark:text-green-400">
				<CheckCircleSolid class="w-16 h-16" />
				<Heading tag="h3">Success!</Heading>
				<P>You've been signed in. Redirecting...</P>
			</div>
		{:else if error}
			<div class="flex flex-col items-center gap-4">
				<ExclamationCircleSolid class="w-16 h-16 text-red-600 dark:text-red-400" />
				<Heading tag="h3" class="text-red-600 dark:text-red-400">Verification Failed</Heading>
				<ErrorList {error} />
				<Button href={configService.routes.auth.request} class="mt-4">Request New Link</Button>
			</div>
		{/if}
	</Card>
</div>
