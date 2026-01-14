<script lang="ts">
	import { AuthService } from "$lib/api/auth.service";

	let email = "";
	let error = "";
	let success = false;
	let loading = false;

	const authService = new AuthService();

	async function handleSubmit(event: Event) {
		event.preventDefault();
		error = "";
		success = false;
		loading = true;

		try {
			await authService.requestMagicLink(email);
			success = true;
		} catch (err) {
			error = "Failed to send magic link. Please try again.";
		} finally {
			loading = false;
		}
	}
</script>

<form
	class="max-w-sm mx-auto mt-16 p-8 bg-white dark:bg-gray-800 rounded shadow"
	on:submit|preventDefault={handleSubmit}>
	<h1 class="text-2xl font-bold mb-6 text-center">Sign In</h1>

	{#if success}
		<div class="mb-4 p-4 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
			<p class="font-semibold">Check your email!</p>
			<p class="text-sm mt-1">We've sent you a magic link to sign in.</p>
		</div>
	{:else if error}
		<div class="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
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
			Send Magic Link
		{/if}
	</button>

	<p class="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
		We'll send you an email with a sign-in link. No password needed!
	</p>
</form>
