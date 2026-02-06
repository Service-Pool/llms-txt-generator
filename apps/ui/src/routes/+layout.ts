import { authService } from '$lib/services/auth.service';
import { authStore } from '$lib/stores/auth.store.svelte';
import type { LoadEvent } from '@sveltejs/kit';

// Disable SSR for the app
const ssr = false;

const load = async ({ fetch }: LoadEvent) => {
	try {
		const res = await authService.getStatus(fetch);
		const data = res.getData();

		if (data.user && data.authenticated) {
			authStore.setUser(data.user);
		} else {
			authStore.setUser(null);
		}
	} catch {
		authStore.setUser(null);
	}
};

export { ssr, load };
