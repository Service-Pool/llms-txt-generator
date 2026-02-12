<script lang="ts">
	import { authService } from '$lib/services/auth.service';
	import { authStore } from '$lib/stores/auth.store.svelte';
	import { EnvelopeSolid, CheckCircleSolid } from 'flowbite-svelte-icons';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { UIError } from '$lib/errors/ui-error';
	import { Card, Heading, P, Label, Input, Button, Alert, InputAddon, ButtonGroup, Spinner } from 'flowbite-svelte';
	import ErrorList from '$lib/components/general/ErrorList.svelte';
	import DelayedRender from '$lib/components/general/DelayedRender.svelte';

	let redirectUrl = $state('');
	let email = $state('');
	let error = $state<string[] | string | null>(null);
	let success = $state(false);
	let loading = $state(false);

	let user = $derived($authStore.user);
	let checkingAuth = $derived($authStore.isLoading);

	// Если пользователь уже залогинен - редирект
	$effect(() => {
		if (!checkingAuth && user) {
			const targetUrl = page.url.searchParams.get('redirectUrl') || '/';
			goto(targetUrl);
		}
	});

	onMount(() => {
		// Откуда пришел пользователь (куда вернуть после логина)
		const targetPath = page.url.searchParams.get('redirectUrl') || '/';
		// URL для ссылки в письме = /auth/verify + параметр с финальным редиректом
		redirectUrl = `${page.url.origin}/auth/verify?target=${encodeURIComponent(targetPath)}`;
	});

	async function handleSubmit(event: Event) {
		event.preventDefault();
		error = null;
		success = false;
		loading = true;

		try {
			await authService.loginLinkRequest(email, redirectUrl);
			success = true;
		} catch (exception) {
			if (exception instanceof UIError) {
				error = exception.context;
			} else if (exception instanceof Error) {
				error = exception.message;
			}
		} finally {
			loading = false;
		}
	}
</script>

<div class="max-w-xl mx-auto mt-20">
	{#if checkingAuth}
		<Card class="text-center">
			<DelayedRender>
				<Spinner size="10" />
			</DelayedRender>
			<P class="mt-4">Checking authentication...</P>
		</Card>
	{:else}
		<Card size="xl" class="py-10 px-10">
			<form class="space-y-6" onsubmit={handleSubmit}>
				<Heading tag="h3" class="text-center">Sign In</Heading>

				{#if success}
					<Alert color="green" class="flex items-start gap-3">
						<CheckCircleSolid class="w-5 h-5 shrink-0 mt-0.5" />
						<div>
							<P weight="semibold" class="mb-1">Check your email!</P>
							<P size="sm">We've sent you a login link to sign in.</P>
						</div>
					</Alert>
				{/if}

				{#if error}
					<Alert color="red"><ErrorList class="text-xs dark:text-black" {error} /></Alert>
				{/if}

				<div class="mb-6">
					<Label for="email" class="mb-2 block">Email</Label>
					<ButtonGroup class="w-full">
						<InputAddon>
							<EnvelopeSolid class="h-4 w-4 text-gray-500 dark:text-gray-400" />
						</InputAddon>
						<Input
							id="email"
							type="email"
							class="pl-8"
							bind:value={email}
							placeholder="name@company.com"
							required
							disabled={success}
						></Input>
					</ButtonGroup>
				</div>

				<Button type="submit" class="w-full" {loading} spinnerProps={{ type: 'dots', size: '5', color: 'teal' }}>
					{#if loading}
						Sending...
					{:else if success}
						Email Sent
					{:else}
						Send Login Link
					{/if}
				</Button>

				<P size="sm" class="text-center">We'll send you an email with a sign-in link. No password needed!</P>
			</form>
		</Card>
	{/if}
</div>
