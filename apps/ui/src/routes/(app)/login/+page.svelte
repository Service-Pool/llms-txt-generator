<script lang="ts">
	import { AuthService } from "$lib/api/auth.service";
	import { type LoginDtoRequest } from "@api/shared";
	import { authStore } from "$lib/stores/auth.store";
	import { goto } from "$app/navigation";

	let email = "";
	let password = "";
	let error = "";
	let loading = false;

	const authService = new AuthService();

	async function handleLogin(event: Event) {
		event.preventDefault();
		error = "";
		loading = true;

		try {
			const credentials: LoginDtoRequest = { email, password };
			const res = await authService.login(credentials);
			const data = res.getMessage().data; // Десериализованный AuthLoginDtoResponse

			authStore.setUser(data.user);
			goto("/");
		} catch (err) {
			throw err;
		} finally {
			loading = false;
		}
	}
</script>

<form
	class="max-w-sm mx-auto mt-16 p-8 bg-white dark:bg-gray-800 rounded shadow"
	on:submit|preventDefault={handleLogin}>
	<h1 class="text-2xl font-bold mb-6 text-center">Login</h1>
	{#if error}
		<div class="mb-4 text-red-600">{error}</div>
	{/if}
	<div class="mb-4">
		<label class="block mb-1" for="email">Email</label>
		<input
			id="email"
			class="w-full px-3 py-2 border rounded"
			type="email"
			bind:value={email}
			autocomplete="email"
			required />
	</div>
	<div class="mb-6">
		<label class="block mb-1" for="password">Пароль</label>
		<input
			id="password"
			class="w-full px-3 py-2 border rounded"
			type="password"
			bind:value={password}
			autocomplete="current-password"
			required />
	</div>
	<button
		class="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
		type="submit"
		disabled={loading}>
		{loading ? "Logging..." : "Login"}
	</button>
</form>
