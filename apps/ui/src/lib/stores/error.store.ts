import { writable } from 'svelte/store';
import { HttpClientError } from '$lib/api/http.client';

export interface ErrorNotification {
	id: string;
	message: string;
	timestamp: number;
}

function logError(...args: unknown[]): void {
	console.error(
		'%c🚨 Application Error %c',
		'background: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;',
		'',
		...args
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
	let message = 'An unexpected error occurred';

	switch (true) {
		case error instanceof HttpClientError:
			message = error.message;
			logError(error.message, error.violations);
			break;

		case error instanceof Error:
			message = error.message;
			logError(error.message);
			break;

		case typeof error === 'string':
			message = error;
			logError(error);
			break;

		case error && typeof error === 'object' && 'message' in error && typeof error.message === 'string':
			message = error.message;
			logError(error.message);
			break;

		case error != null:
			try {
				message = JSON.stringify(error);
			} catch {
				message = 'An unexpected error occurred';
			}
			logError(message);
			break;
	}

	errorStore.add(message);
}

export { handleCriticalError };
export const errorStore = createErrorStore();
