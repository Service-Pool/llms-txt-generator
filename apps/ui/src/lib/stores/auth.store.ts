import { writable } from 'svelte/store';
import type { AuthLoginDtoResponse } from '@api/shared';

export type AuthUser = AuthLoginDtoResponse['user'];

export interface AuthState {
	user: AuthUser | null;
	isLoading: boolean;
}

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>({ user: null, isLoading: true });

	return {
		subscribe,
		setUser: (user: AuthUser | null) => { update(state => ({ ...state, user, isLoading: false })); },
		setLoading: (isLoading: boolean) => { update(state => ({ ...state, isLoading })); },
		reset: () => { set({ user: null, isLoading: false }); }
	};
}

export const authStore = createAuthStore();
