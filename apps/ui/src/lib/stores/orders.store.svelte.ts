import { ordersService } from '$lib/services/orders.service';
import type { OrderResponseDto } from '@api/shared';

/**
 * Orders Store - centralized state management for orders
 * All order mutations should go through this store to ensure reactivity
 */
class OrdersStore {
	items = $state<OrderResponseDto[] | null>(null);
	loading = $state(false);
	error = $state<string | null>(null);
	page = $state(1);
	limit = $state(5);
	total = $state(0);

	/**
	 * Load orders from API
	 */
	async loadOrders(page?: number, limit?: number) {
		if (page !== undefined) this.page = page;
		if (limit !== undefined) this.limit = limit;

		try {
			this.loading = true;
			this.error = null;
			const response = await ordersService.getAll(this.page, this.limit);
			const data = response.getData();
			this.items = data.items;
			this.total = data.total;
		} catch (exception) {
			this.error = exception instanceof Error ? exception.message : 'Failed to load orders';
			throw exception;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Add new order to the beginning of the list
	 */
	addOrder(order: OrderResponseDto) {
		this.items = [order, ...(this.items ?? [])];
		this.total += 1;
	}

	/**
	 * Update existing order in the list (or add if not found)
	 */
	updateOrder(updatedOrder: OrderResponseDto) {
		if (!this.items) {
			this.items = [updatedOrder];
			return;
		}
		const index = this.items.findIndex(o => o.id === updatedOrder.id);
		if (index !== -1) {
			this.items[index] = updatedOrder;
			// Trigger reactivity by creating new array
			this.items = [...this.items];
		} else {
			// Add order if not in the list
			this.items = [updatedOrder, ...this.items];
		}
	}

	/**
	 * Remove order from the list
	 */
	removeOrder(orderId: number) {
		if (!this.items) return;
		this.items = this.items.filter(o => o.id !== orderId);
		this.total -= 1;
	}

	/**
	 * Get order by ID from the list
	 */
	getById(orderId: number): OrderResponseDto | undefined {
		return this.items?.find(o => o.id === orderId);
	}

	/**
	 * Refresh specific order from API
	 */
	async refreshOrder(orderId: number) {
		const response = await ordersService.getById(orderId);
		const updatedOrder = response.getData();
		this.updateOrder(updatedOrder);
	}

	/**
	 * Change page
	 */
	setPage(newPage: number) {
		void this.loadOrders(newPage);
	}

	/**
	 * Change limit
	 */
	setLimit(newLimit: number) {
		void this.loadOrders(1, newLimit); // Reset to first page
	}

	/**
	 * Reset store to initial state
	 */
	reset() {
		this.items = null;
		this.loading = false;
		this.error = null;
		this.page = 1;
		this.limit = 5;
		this.total = 0;
	}
}

export const ordersStore = new OrdersStore();
