<script lang="ts">
	import { page } from "$app/stores";

	const navItems = [
		{ href: "/", label: "Home" },
		{ href: "/generations", label: "Generations" },
		{ href: "/about", label: "About" },
	];
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

				<div class="flex gap-4">
					{#each navItems as item}
						<a
							href={item.href}
							class="px-3 py-2 rounded-md text-sm font-medium transition {$page
								.url.pathname === item.href
								? 'bg-blue-600 text-white'
								: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}">
							{item.label}
						</a>
					{/each}
				</div>
			</div>
		</div>
	</div>
</nav>
