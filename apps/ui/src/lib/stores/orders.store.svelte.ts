import { ordersService } from '$lib/services/orders.service';
import { socketStore } from './socket.store.svelte';
import type { OrderResponseDto } from '@api/shared';

type OrdersBroadcastMessage = | { type: 'ORDER_CREATED'; order: OrderResponseDto }
	| { type: 'ORDER_UPDATED'; order: OrderResponseDto }
	| { type: 'ORDER_DELETED'; orderId: number };

/**
 * Orders Store - centralized state management for orders
 *
 * All order mutations should go through this store to ensure reactivity.
 *
 * ⚠️ DOMAIN LOGIC:
 * This store does NOT contain domain logic (transitions, stepper state, etc).
 * For domain logic, use OrderStateMachine from $lib/domain/order.
 *
 * Example usage with OrderStateMachine:
 * ```typescript
 * import { ordersStore } from '$lib/stores/orders.store.svelte';
 * import { OrderStateMachine } from '$lib/domain/order';
 *
 * const order = ordersStore.getById(123);
 * const transitions = OrderStateMachine.getAvailableTransitions(order);
 * const stepperState = OrderStateMachine.getStepperState(order);
 * ```
 */
class OrdersStore {
	items = $state<OrderResponseDto[] | null>(null);
	loading = $state(false);
	error = $state<string | null>(null);
	page = $state(1);
	limit = $state(5);
	total = $state(0);

	private channel: BroadcastChannel | null = null;
	private isChannelInitialized = false;

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
			this.items = data.attributes.items;
			this.total = data.attributes.total;
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
		const index = this.items.findIndex(o => o.attributes.id === updatedOrder.attributes.id);
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
		this.items = this.items.filter(o => o.attributes.id !== orderId);
		this.total -= 1;
	}

	/**
	 * Get order by ID from the list
	 */
	getById(orderId: number): OrderResponseDto | undefined {
		return this.items?.find(o => o.attributes.id === orderId);
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
	 * Delete order via API and remove from store
	 */
	async deleteOrder(orderId: number) {
		await ordersService.deleteOrder(orderId);
		this.removeOrder(orderId);
		this.broadcastOrderDeleted(orderId);
		socketStore.unsubscribeFromOrder(orderId);
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
	 * Initialize BroadcastChannel for cross-tab synchronization
	 */
	initChannel() {
		if (this.isChannelInitialized) return;
		this.isChannelInitialized = true;

		this.channel = new BroadcastChannel('orders-sync');

		this.channel.onmessage = (event: MessageEvent<OrdersBroadcastMessage>) => {
			const message = event.data;

			switch (message.type) {
				case 'ORDER_CREATED':
					this.addOrder(message.order);
					break;
				case 'ORDER_UPDATED':
					this.updateOrder(message.order);
					break;
				case 'ORDER_DELETED':
					this.removeOrder(message.orderId);
					break;
			}
		};
	}

	/**
	 * Broadcast order creation to other tabs
	 */
	broadcastOrderCreated(order: OrderResponseDto) {
		this.ensureChannelInitialized();
		this.channel?.postMessage({ type: 'ORDER_CREATED', order } satisfies OrdersBroadcastMessage);
	}

	/**
	 * Broadcast order update to other tabs
	 */
	broadcastOrderUpdated(order: OrderResponseDto) {
		this.ensureChannelInitialized();
		this.channel?.postMessage({ type: 'ORDER_UPDATED', order } satisfies OrdersBroadcastMessage);
	}

	/**
	 * Broadcast order deletion to other tabs
	 */
	broadcastOrderDeleted(orderId: number) {
		this.ensureChannelInitialized();
		this.channel?.postMessage({ type: 'ORDER_DELETED', orderId } satisfies OrdersBroadcastMessage);
	}

	/**
	 * Ensure channel is initialized before broadcasting
	 */
	private ensureChannelInitialized() {
		if (!this.isChannelInitialized) {
			this.initChannel();
		}
	}

	/**
	 * Destroy BroadcastChannel
	 */
	destroyChannel() {
		this.isChannelInitialized = false;
		if (this.channel) {
			this.channel.close();
			this.channel = null;
		}
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
		this.destroyChannel();
	}
}

export const ordersStore = new OrdersStore();
