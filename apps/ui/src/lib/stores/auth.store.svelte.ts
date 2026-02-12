import { writable } from 'svelte/store';
import type { AuthLoginDtoResponse } from '@api/shared';
import { authService } from '$lib/services/auth.service';

type AuthUser = AuthLoginDtoResponse['user'];

interface AuthState {
	user: AuthUser | null;
	isLoading: boolean;
}

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>({
		user: null,
		isLoading: true
	});

	return {
		subscribe,
		setUser: (user: AuthUser | null) => {
			update(state => ({ ...state, user, isLoading: false }));
		},
		setLoading: (isLoading: boolean) => {
			update(state => ({ ...state, isLoading }));
		},
		reset: () => {
			set({ user: null, isLoading: false });
		},
		refreshAuthStatus: async (fetchFn?: typeof fetch) => {
			try {
				const res = await authService.getStatus(fetchFn);
				const data = res.getData();

				if (data.user && data.authenticated) {
					update(state => ({ ...state, user: data.user, isLoading: false }));
				} else {
					update(state => ({ ...state, user: null, isLoading: false }));
				}
			} catch {
				update(state => ({ ...state, user: null, isLoading: false }));
			}
		}
	};
}

export const authStore = createAuthStore();
