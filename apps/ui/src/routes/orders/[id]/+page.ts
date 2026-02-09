import { error } from '@sveltejs/kit';

export function load() {
	// TEMPORARY: Remove this line to restore normal functionality
	error(404, 'Order not found');
}
