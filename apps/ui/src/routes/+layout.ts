import { authService } from '$lib/services/auth.service';
import { authStore } from '$lib/stores/auth.store.svelte';

// Disable SSR for the app
const ssr = false;

const load = async () => {
	try {
		const res = await authService.getStatus();
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
