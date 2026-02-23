<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { fly } from 'svelte/transition';
	import { authStore } from '$lib/stores/auth.store.svelte';
	import { ordersStore } from '$lib/stores/orders.store.svelte';
	import { statsStore } from '$lib/stores/stats.store.svelte';
	import { socketStore } from '$lib/stores/socket.store.svelte';
	import { Navbar, NavBrand, NavLi, NavUl, NavHamburger, DarkMode, Button, Spinner } from 'flowbite-svelte';
	import { configService } from '$lib/services/config.service';

	interface Props {
		class?: string;
		fluid?: boolean;
		fullWidth?: boolean;
		sticky?: boolean;
	}

	let { class: className = '', fluid = true, fullWidth = false, sticky = false }: Props = $props();

	const navItems = [
		// { href: configService.routes.home, label: 'Home' },
		{ href: configService.routes.ordersNew, label: 'New LLMs.txt' },
		{ href: configService.routes.orders, label: 'Your Generations' },
		{ href: configService.routes.api, label: 'API', target: '_blank' },
		{ href: configService.routes.about, label: 'About' }
	];

	let currentPath = $derived(page.url.pathname);
	let user = $derived($authStore.user);
	let isLoading = $derived($authStore.isLoading);

	let isStuck = $state(false);

	$effect(() => {
		if (!sticky) return;

		const handleScroll = () => {
			isStuck = window.scrollY > 20;
		};

		// Проверяем сразу при монтировании
		handleScroll();

		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	});

	async function handleLogin() {
		goto(configService.routes.auth.request);
	}

	async function handleLogout() {
		// Store инкапсулирует всю логику logout
		await authStore.logout();

		// Очищаем остальные store'ы
		ordersStore.reset();
		statsStore.reset();
		socketStore.destroy();

		location.reload();
	}
</script>

<header
	class="z-50 w-full border-b transition-shadow duration-300 {className}"
	class:sticky
	class:top-0={sticky}
	class:shadow-sm={isStuck}
	class:dark:shadow-md={isStuck}
	class:border-gray-200={isStuck}
	class:dark:border-gray-700={isStuck}
	class:border-transparent={!isStuck}
>
	<div class="mx-auto" class:container={!fullWidth}>
		<Navbar {fluid} class="sm:px-0 px-0">
			<NavBrand href="/" class="mb-1">
				<!-- светлая -->
				<svg class="w-10 h-10 sm:h-9 me-3 dark:hidden">
					<use href="/logo.svg#logo-light" />
				</svg>

				<!-- тёмная -->
				<svg class="w-10 h-10 sm:h-9 me-3 hidden dark:inline">
					<use href="/logo.svg#logo-dark" />
				</svg>

				<span class="self-center whitespace-nowrap hidden text-sm sm:inline font-semibold dark:text-white">
					LLM Ready
				</span>
			</NavBrand>
			<div class="flex items-center mb-1">
				<NavUl transition={fly} activeUrl={currentPath}>
					{#each navItems as item}
						{#if item.target}
							<NavLi><a href={item.href} target={item.target} rel="noopener noreferrer">{item.label}</a></NavLi>
						{:else}
							<NavLi href={item.href}>{item.label}</NavLi>
						{/if}
					{/each}
				</NavUl>
				<DarkMode class="text-lg mr-3" />
				{#if isLoading}
					<Button class="min-w-20" color="primary">
						<Spinner size="5" type="dots" class="fill-primary-50" />
					</Button>
				{:else if user}
					<Button class="min-w-20" disabled={isLoading} onclick={handleLogout} color="red">Logout</Button>
				{:else}
					<Button class="min-w-20" disabled={isLoading} onclick={handleLogin} color="primary">Login</Button>
				{/if}
				<NavHamburger />
			</div>
		</Navbar>
	</div>
</header>
