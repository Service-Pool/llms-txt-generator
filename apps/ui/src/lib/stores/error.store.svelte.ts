import { UIError } from '$lib/errors/ui-error';

export interface ErrorNotification {
	id: string;
	message: string;
	timestamp: number;
	visible: boolean;
	timeoutId?: ReturnType<typeof setTimeout>;
}

function logError(...args: unknown[]): void {
	console.error(
		'%c🚨 Application Error %c',
		'background: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;',
		'',
		...args
	);
}

class ErrorStore {
	private errors = $state<ErrorNotification[]>([]);

	get value(): ErrorNotification[] {
		return this.errors;
	}

	add(message: string) {
		const error: ErrorNotification = {
			id: crypto.randomUUID(),
			message,
			timestamp: Date.now(),
			visible: true
		};

		// Auto-dismiss after 5 seconds
		const timeoutId = setTimeout(() => {
			this.dismiss(error.id);
		}, 5000);
		error.timeoutId = timeoutId;

		this.errors = [...this.errors, error];
	}

	remove(id: string) {
		const error = this.errors.find(e => e.id === id);
		if (error?.timeoutId) {
			clearTimeout(error.timeoutId);
		}
		this.errors = this.errors.filter(e => e.id !== id);
	}

	dismiss(id: string) {
		const error = this.errors.find(e => e.id === id);
		if (error?.timeoutId) {
			clearTimeout(error.timeoutId);
		}

		// Set visible to false to trigger outro transition
		this.errors = this.errors.map(e => e.id === id ? { ...e, visible: false } : e);

		// Remove from array after transition completes
		setTimeout(() => {
			this.errors = this.errors.filter(e => e.id !== id);
		}, 700);
	}

	clear() {
		this.errors.forEach((error) => {
			if (error.timeoutId) {
				clearTimeout(error.timeoutId);
			}
		});
		this.errors = [];
	}
}

export const errorStore = new ErrorStore();

function handleCriticalError(error: unknown): void {
	let message = 'An unexpected error occurred';

	switch (true) {
		case error instanceof UIError:
			message = error.message;
			if (error.context && error.context.length > 0) {
				logError(error.message, error.context);
			} else {
				logError(error.message);
			}
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
