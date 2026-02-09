<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { fly } from 'svelte/transition';
	import { authStore } from '$lib/stores/auth.store.svelte';
	import { authService } from '$lib/services/auth.service';
	import { configService } from '$lib/services/config.service';
	import Spinner from './Spinner.svelte';
	import { Navbar, NavBrand, NavLi, NavUl, NavHamburger, Button, DarkMode } from 'flowbite-svelte';

	const navItems = [
		// { href: configService.routes.home, label: 'Home' },
		{ href: configService.routes.orders, label: 'Generate' },
		{ href: configService.routes.about, label: 'About' }
	];

	let currentPath = $derived(page.url.pathname);
	let user = $derived($authStore.user);
	let isLoading = $derived($authStore.isLoading);

	async function handleLogin() {
		goto(configService.routes.auth.request);
	}

	async function handleLogout() {
		await authService.logout();
		authStore.reset();
		goto('/');
	}
</script>

<Navbar fluid={true} class="sm:px-0 px-0">
	<NavBrand href="/" class="mb-1">
		<img src="/favicon.svg" class="me-3 h-6 sm:h-9" alt="Flowbite Logo" />
		<span class="self-center whitespace-nowrap text-sm sm:text-xl font-semibold dark:text-white">
			LLMs.txt Generator
		</span>
	</NavBrand>
	<div class="flex items-center mb-1">
		<NavUl transition={fly} activeUrl={currentPath}>
			{#each navItems as item}
				<NavLi href={item.href}>{item.label}</NavLi>
			{/each}
		</NavUl>
		<DarkMode class="text-lg mr-3" />
		{#if isLoading}
			<Spinner size="6" />
		{:else if user}
			<Button onclick={handleLogout} color="red" size="sm">Logout</Button>
		{:else}
			<Button onclick={handleLogin} color="primary" size="sm">Login</Button>
		{/if}
		<NavHamburger />
	</div>
</Navbar>
