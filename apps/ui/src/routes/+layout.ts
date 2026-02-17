// import { authStore } from '$lib/stores/auth.store.svelte';
// import type { LoadEvent } from '@sveltejs/kit';

// Disable SSR for the app
const ssr = false;

// const load = async ({ fetch }: LoadEvent) => {
//	await authStore.refreshAuthStatus(fetch);
// };

export { ssr };
