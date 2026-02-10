import { configService } from '$lib/services/config.service';
import { WebSocketResponse, WebSocketEvent, OrderResponseDto } from '@api/shared';
import { ordersStore } from './orders.store.svelte';

/**
 * Order WebSocket Store - real-time updates for order progress and completion
 */
class OrderWebSocketStore {
	private socket: WebSocket | null = null;
	private reconnectTimeout: number | null = null;
	private isInitialized = false;
	private subscribedOrderIds = new Set<number>();
	private pendingMessages: Array<{ action: 'subscribe' | 'unsubscribe'; orderIds: number[] }> = [];

	/**
	 * Initialize WebSocket connection
	 */
	init(): void {
		if (this.isInitialized) return;
		this.isInitialized = true;

		this.connectWebSocket();
	}

	/**
	 * Connect to WebSocket endpoint
	 */
	private connectWebSocket(): void {
		const wsUrl = `${configService.websocket.url}/orders`;

		this.socket = new WebSocket(wsUrl);

		this.socket.onopen = () => {
			if (this.reconnectTimeout) {
				clearTimeout(this.reconnectTimeout);
				this.reconnectTimeout = null;
			}

			// Send all pending messages
			this.flushPendingMessages();

			// Re-subscribe to all previously subscribed orders when reconnecting
			this.resubscribeToAllOrders();
		};

		this.socket.onmessage = (event: MessageEvent) => {
			const json = JSON.parse(event.data as string) as Record<string, unknown>;

			// Handle standard WebSocket messages
			if (json.event && json.data) {
				const message = WebSocketResponse.fromJSON(json, OrderResponseDto);
				this.handleWebSocketMessage(message);
			} else if (json.event === 'error') {
				throw new Error(`[OrderWebSocketStore] WebSocket connection error: ${JSON.stringify(json.data)}`);
			}
		};

		this.socket.onerror = (event: Event) => {
			console.error('[OrderWebSocketStore] WebSocket error:', event);
		};

		this.socket.onclose = () => {
			this.socket = null;

			// Reconnect after 5 seconds
			this.reconnectTimeout = window.setTimeout(() => {
				if (this.isInitialized) {
					this.connectWebSocket();
				}
			}, 5000);
		};
	}

	/**
	 * Handle incoming WebSocket messages
	 */
	private handleWebSocketMessage(message: WebSocketResponse<OrderResponseDto>): void {
		switch (message.getEvent()) {
			case WebSocketEvent.ORDER_UPDATE:
				this.handleOrderUpdate(message.getData());
				break;

			default:
				// Ignore other event types
				break;
		}
	}

	/**
	 * Handle order updates with complete OrderResponseDto
	 */
	private handleOrderUpdate(orderDto: OrderResponseDto): void {
		try {
			// Only process if we're subscribed to this order
			if (!this.subscribedOrderIds.has(orderDto.id)) {
				return;
			}

			// Direct update with complete DTO - no mapping needed!
			ordersStore.updateOrder(orderDto);

			// Automatically unsubscribe from completed orders to avoid memory leaks
			if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(orderDto.status)) {
				this.unsubscribeFromOrder(orderDto.id);
			}
		} catch (error) {
			console.error('[OrderWebSocketStore] Failed to handle order update:', error);
		}
	}

	/**
	 * Send subscription message to server
	 */
	private sendSubscriptionMessage(action: 'subscribe' | 'unsubscribe', orderIds: number[]): void {
		if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
			// Buffer the message for later
			this.pendingMessages.push({ action, orderIds });
			return;
		}

		const message = {
			action,
			orderIds // Use array format
		};

		this.socket.send(JSON.stringify(message));
	}

	/**
	 * Flush all pending messages when WebSocket opens
	 */
	private flushPendingMessages(): void {
		if (this.pendingMessages.length === 0) return;

		const messages = [...this.pendingMessages];
		this.pendingMessages = [];

		for (const { action, orderIds } of messages) {
			this.sendSubscriptionMessage(action, orderIds);
		}
	}

	/**
	 * Re-subscribe to all orders after reconnection
	 */
	private resubscribeToAllOrders(): void {
		if (this.subscribedOrderIds.size === 0) return;

		// Subscribe to all orders in one message
		const orderIds = Array.from(this.subscribedOrderIds);
		this.sendSubscriptionMessage('subscribe', orderIds);
	}

	/**
	 * Subscribe to updates for a specific order
	 */
	subscribeToOrder(orderId: number): void {
		this.subscribedOrderIds.add(orderId);

		// Send subscription message to server
		this.sendSubscriptionMessage('subscribe', [orderId]);
	}

	/**
	 * Subscribe to multiple orders at once
	 */
	subscribeToOrders(orderIds: number[]): void {
		orderIds.forEach((id) => {
			this.subscribedOrderIds.add(id);
		});

		// Send single subscription message for all orders
		this.sendSubscriptionMessage('subscribe', orderIds);
	}

	/**
	 * Unsubscribe from updates for a specific order
	 */
	unsubscribeFromOrder(orderId: number): void {
		this.subscribedOrderIds.delete(orderId);

		// Send unsubscribe message to server
		this.sendSubscriptionMessage('unsubscribe', [orderId]);
	}

	/**
	 * Unsubscribe from all orders
	 */
	unsubscribeFromAllOrders(): void {
		this.subscribedOrderIds.clear();
	}

	/**
	 * Get list of currently subscribed order IDs
	 */
	getSubscribedOrderIds(): number[] {
		return Array.from(this.subscribedOrderIds);
	}

	/**
	 * Check if subscribed to specific order
	 */
	isSubscribedToOrder(orderId: number): boolean {
		return this.subscribedOrderIds.has(orderId);
	}

	/**
	 * Destroy store: close WebSocket and cleanup
	 */
	destroy(): void {
		this.isInitialized = false;
		this.subscribedOrderIds.clear();
		this.pendingMessages = [];

		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}

		if (this.socket) {
			this.socket.close();
			this.socket = null;
		}
	}
}

// Singleton instance
export const orderWebSocketStore = new OrderWebSocketStore();
