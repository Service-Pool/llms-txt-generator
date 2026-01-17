<script lang="ts">
	import { onMount } from "svelte";
	import { page } from "$app/stores";
	import { goto } from "$app/navigation";
	import { AuthService } from "$lib/api/auth.service";
	import { authStore } from "$lib/stores/auth.store";
	import { HttpClientError } from "../../../../lib/api/http.client";
	import { ResponseCode } from "@api/shared";

	let loading = true;
	let error: string[] | null = null;
	let success = false;

	const authService = new AuthService();

	onMount(async () => {
		const crd = $page.url.searchParams.get("crd");

		if (!crd) {
			error = ["Invalid login link"];
			loading = false;
			return;
		}

		try {
			const res = await authService.verifyLoginLink(crd);
			const data = res.getMessage().data;

			// Update auth store
			authStore.setUser(data.user);

			success = true;

			// Redirect after a short delay
			setTimeout(() => {
				data.redirectUrl ? goto(data.redirectUrl) : null;
			}, 1000);
		} catch (err) {
			if (err instanceof HttpClientError) {
				error = err.violations;
			}
			throw err;
		} finally {
			loading = false;
		}
	});
</script>

<div
	class="max-w-sm mx-auto mt-16 p-8 bg-white dark:bg-gray-800 rounded shadow text-center">
	{#if loading}
		<div class="flex flex-col items-center">
			<svg
				class="animate-spin h-12 w-12 text-blue-600 mb-4"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24">
				<circle
					class="opacity-25"
					cx="12"
					cy="12"
					r="10"
					stroke="currentColor"
					stroke-width="4"></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
			<p class="text-lg">Verifying your login link...</p>
		</div>
	{:else if success}
		<div class="text-green-600 dark:text-green-400">
			<svg
				class="h-16 w-16 mx-auto mb-4"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
			</svg>
			<h1 class="text-2xl font-bold mb-2">Success!</h1>
			<p>You've been signed in. Redirecting...</p>
		</div>
	{:else if error}
		<div class="text-red-600 dark:text-red-400">
			<svg
				class="h-16 w-16 mx-auto mb-4"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
				></path>
			</svg>
			<h1 class="text-2xl font-bold mb-2">Verification Failed</h1>
			<ul class="mb-4 list-disc list-inside text-sm space-y-1">
				{#each error as errMsg}
					<li>{errMsg}</li>
				{/each}
			</ul>
			<a
				href="/login"
				class="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
				Request New Link
			</a>
		</div>
	{/if}
</div>
