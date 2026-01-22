<script lang="ts">
	import { page } from "$app/state";
	import { authStore } from "$lib/stores/auth.store";
	import { authService } from "$lib/api/auth.service";
	import { onMount } from "svelte";
	import Spinner from "./Spinner.svelte";
	import { ChevronDownOutline } from "flowbite-svelte-icons";
	import { fly, scale } from "svelte/transition";
	import {
		Navbar,
		NavBrand,
		NavLi,
		NavUl,
		NavHamburger,
		Button,
		Dropdown,
		DropdownItem,
		DarkMode,
	} from "flowbite-svelte";

	const navItems = [
		{ href: "/", label: "Home" },
		{ href: "/generations", label: "Generations" },
		{ href: "/about", label: "About" },
	];

	let user = $state<any>(null);
	let isLoading = $state(true);

	authStore.subscribe((state) => {
		user = state.user;
		isLoading = state.isLoading;
	});

	onMount(async () => {
		try {
			const res = await authService.getStatus();
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

	async function handleLogout() {
		await authService.logout();
		authStore.reset();
		window.location.href = "/";
	}
</script>

<Navbar>
	<NavBrand href="/" class="mb-1">
		<span class="self-center whitespace-nowrap text-xl font-semibold">
			LLMs.txt Generator
		</span>
	</NavBrand>

	<div class="flex items-center gap-2 md:order-2">
		<DarkMode class="text-lg" />
		{#if isLoading}
			<Spinner size="6" />
		{:else if user}
			<div class="flex md:order-2">
				<Button size="sm" color="primary" class="cursor-pointer"
					>{user.email}<ChevronDownOutline
						class="ms-2 inline h-4 w-4" /></Button>
				<Dropdown
					simple
					transition={scale}
					transitionParams={{ duration: 200 }}
					class="w-54">
					<DropdownItem onclick={handleLogout}>Logout</DropdownItem>
				</Dropdown>
			</div>
		{:else}
			<Button href="/login" color="primary">Login</Button>
		{/if}

		<NavHamburger />
	</div>

	<NavUl transition={fly} activeUrl={page.url.pathname}>
		{#each navItems as item}
			<NavLi href={item.href}>{item.label}</NavLi>
		{/each}
	</NavUl>
</Navbar>
