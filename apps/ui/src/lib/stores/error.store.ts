import { writable } from 'svelte/store';
import { HttpClientError } from '$lib/api/http.client';

export interface ErrorNotification {
	id: string;
	message: string;
	timestamp: number;
}

function logError(error: unknown): void {
	console.error(
		'%c🚨 Application Error %c',
		'background: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;',
		'',
		error
	);
}

function createErrorStore() {
	const { subscribe, update } = writable<ErrorNotification[]>([]);

	return {
		subscribe,
		add: (message: string) => {
			const error: ErrorNotification = {
				id: crypto.randomUUID(),
				message,
				timestamp: Date.now()
			};

			update(errors => [...errors, error]);

			// Auto-remove after 5 seconds
			setTimeout(() => {
				update(errors => errors.filter(e => e.id !== error.id));
			}, 5000);
		},
		remove: (id: string) => {
			update(errors => errors.filter(e => e.id !== id));
		},
		clear: () => {
			update(() => []);
		}
	};
}

function handleCriticalError(error: unknown): void {
	logError(error);

	let message = 'An unexpected error occurred';

	if (error instanceof HttpClientError) {
		message = error.message;
	} else if (error instanceof Error) {
		message = error.message;
	} else if (typeof error === 'string') {
		message = error;
	} else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
		message = error.message;
	} else if (error != null) {
		try {
			message = JSON.stringify(error);
		} catch {
			message = 'An unexpected error occurred';
		}
	}

	errorStore.add(message);
}

export { handleCriticalError };
export const errorStore = createErrorStore();
