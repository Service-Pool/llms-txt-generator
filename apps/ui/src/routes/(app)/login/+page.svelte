<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { page } from "$app/stores";
	import { AuthService } from "$lib/api/auth.service";
	import { authStore } from "$lib/stores/auth.store";

	let redirectUrl = "";
	let email = "";
	let error = "";
	let success = false;
	let loading = false;
	let checkingAuth = true;

	const authService = new AuthService();

	onMount(async () => {
		redirectUrl = $page.url.href;
		// Check if already authenticated

		const res = await authService.getStatus();
		const data = res.getMessage().data;

		if (data.authenticated && data.user) {
			authStore.setUser(data.user);
			const redirectUrl = $page.url.searchParams.get("redirectUrl");

			// Redirect to specified URL or home page
			goto(redirectUrl || "/");
			return;
		}

		checkingAuth = false;
	});

	async function handleSubmit(event: Event) {
		event.preventDefault();
		error = "";
		success = false;
		loading = true;

		try {
			await authService.requestLoginLink(email, redirectUrl);
			success = true;
		} catch (err) {
			error = "Failed to send login link. Please try again.";
		} finally {
			loading = false;
		}
	}
</script>

{#if checkingAuth}
	<div class="max-w-sm mx-auto mt-16 p-8 text-center">
		<p class="text-gray-600 dark:text-gray-400">
			Checking authentication...
		</p>
	</div>
{:else}
	<form
		class="max-w-sm mx-auto mt-16 p-8 bg-white dark:bg-gray-800 rounded shadow"
		on:submit|preventDefault={handleSubmit}>
		<h1 class="text-2xl font-bold mb-6 text-center">Sign In</h1>

		{#if success}
			<div
				class="mb-4 p-4 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
				<p class="font-semibold">Check your email!</p>
				<p class="text-sm mt-1">
					We've sent you a login link to sign in.
				</p>
			</div>
		{:else if error}
			<div
				class="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
				{error}
			</div>
		{/if}

		<div class="mb-4">
			<label class="block mb-1" for="email">Email</label>
			<input
				id="email"
				class="w-full px-3 py-2 border rounded"
				type="email"
				bind:value={email}
				autocomplete="email"
				required
				disabled={success} />
		</div>

		<button
			class="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
			type="submit"
			disabled={loading || success}>
			{#if loading}
				Sending...
			{:else if success}
				Email Sent
			{:else}
				Send Login Link
			{/if}
		</button>

		<p class="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
			We'll send you an email with a sign-in link. No password needed!
		</p>
	</form>
{/if}
