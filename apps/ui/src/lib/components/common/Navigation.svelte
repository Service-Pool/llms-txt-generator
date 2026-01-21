<script lang="ts">
	import { page } from "$app/state";
	import { authStore } from "$lib/stores/auth.store";
	import { authService } from "$lib/api/auth.service";
	import { onMount } from "svelte";

	const navItems = [
		{ href: "/", label: "Home" },
		{ href: "/generations", label: "Generations" },
		{ href: "/about", label: "About" },
	];

	let user = $state<any>(null);
	let isLoading = $state(true);
	let showMenu = $state(false);
	let mobileMenuOpen = $state(false);

	authStore.subscribe((state) => {
		user = state.user;
		isLoading = state.isLoading;
	});

	onMount(async () => {
		try {
			const res = await authService.getStatus();
			// getMessage() returns MessageSuccess<AuthStatusDtoResponse>
			const status = res.getMessage();
			if (status?.data?.user) {
				authStore.setUser(status.data.user);
			} else {
				authStore.setUser(null);
			}
		} catch {
			authStore.setUser(null);
		}
	});

	function handleLogin() {
		window.location.href = "/login";
	}

	async function handleLogout() {
		await authService.logout();
		authStore.reset();
		window.location.href = "/";
	}
</script>

<nav
	class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
	<div class="container mx-auto px-4 max-w-7xl">
		<div class="flex items-center justify-between h-16">
			<div class="flex items-center gap-8">
				<a
					href="/"
					class="text-xl font-bold text-gray-900 dark:text-white">
					LLMs.txt Generator
				</a>
				<!-- Desktop Navigation -->
				<div class="hidden md:flex gap-4">
					{#each navItems as item}
						<a
							href={item.href}
							class="px-3 py-2 rounded-md text-sm font-medium transition {page
								.url.pathname === item.href
								? 'bg-blue-600 text-white'
								: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}">
							{item.label}
						</a>
					{/each}
				</div>
			</div>

			<div class="flex items-center gap-2">
				<!-- Desktop Auth -->
				<div class="hidden md:block">
					{#if isLoading}
						<span class="text-gray-500 text-sm">Loading...</span>
					{:else if user}
						<div class="relative inline-block text-left">
							<button
								class="px-3 py-2 rounded-md text-sm font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white flex items-center gap-2"
								aria-haspopup="true"
								aria-expanded="false"
								onclick={() => (showMenu = !showMenu)}>
								{user.email}
								<svg
									class="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 9l-7 7-7-7" /></svg>
							</button>
							{#if showMenu}
								<div
									class="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-10">
									<button
										class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
										onclick={handleLogout}>Logout</button>
								</div>
							{/if}
						</div>
					{:else}
						<button
							class="px-3 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
							onclick={handleLogin}>
							Login
						</button>
					{/if}
				</div>

				<!-- Mobile menu button -->
				<button
					class="md:hidden p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
					aria-label="Toggle menu"
					onclick={() => (mobileMenuOpen = !mobileMenuOpen)}>
					<svg
						class="w-6 h-6"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24">
						{#if mobileMenuOpen}
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12" />
						{:else}
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 6h16M4 12h16M4 18h16" />
						{/if}
					</svg>
				</button>
			</div>
		</div>

		<!-- Mobile menu -->
		{#if mobileMenuOpen}
			<div
				class="md:hidden py-4 border-t border-gray-200 dark:border-gray-700">
				<div class="flex flex-col gap-2">
					{#each navItems as item}
						<a
							href={item.href}
							onclick={() => (mobileMenuOpen = false)}
							class="px-3 py-2 rounded-md text-sm font-medium transition {page
								.url.pathname === item.href
								? 'bg-blue-600 text-white'
								: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}">
							{item.label}
						</a>
					{/each}
					<div
						class="border-t border-gray-200 dark:border-gray-700 my-2">
					</div>
					{#if isLoading}
						<span class="px-3 py-2 text-gray-500 text-sm"
							>Loading...</span>
					{:else if user}
						<div
							class="px-3 py-2 text-sm text-gray-900 dark:text-white">
							{user.email}
						</div>
						<button
							class="px-3 py-2 rounded-md text-sm font-medium text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
							onclick={handleLogout}>
							Logout
						</button>
					{:else}
						<button
							class="px-3 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
							onclick={handleLogin}>
							Login
						</button>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</nav>
