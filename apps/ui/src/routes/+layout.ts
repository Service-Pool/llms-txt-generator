// import { authStore } from '$lib/stores/auth.store.svelte';
// import type { LoadEvent } from '@sveltejs/kit';

// Enable SSR for dynamic content, disable prerendering
const ssr = true;
const prerender = false;

// const load = async ({ fetch }: LoadEvent) => {
//	await authStore.refreshAuthStatus(fetch);
// };

export { ssr, prerender };
