import { Injectable, Logger } from '@nestjs/common';
import { OrderStatus } from '../../../enums/order-status.enum';
import { WebSocketEvent } from '../../../enums/websocket-event.enum';
import type { WebSocket } from '@fastify/websocket';
import {
	OrderQueueEvent,
	OrderProgressEvent,
	OrderCompletionEvent,
	StatsUpdateEvent,
	WebSocketMessage
} from '../websocket.events';

/**
 * WebSocket Service
 * Manages WebSocket connections and broadcasts order updates
 */
@Injectable()
class WebSocketService {
	private readonly logger = new Logger(WebSocketService.name);

	// Map of order subscriptions: key = "order:${orderId}", value = Set of WebSocket clients
	private clients: Map<string, Set<WebSocket>> = new Map();

	// Set of clients subscribed to stats updates
	private statsClients: Set<WebSocket> = new Set();

	/**
	 * Subscribe client to order updates
	 */
	subscribe(orderId: number, client: WebSocket): void {
		const key = `order:${orderId}`;

		if (!this.clients.has(key)) {
			this.clients.set(key, new Set());
		}

		this.clients.get(key).add(client);
		this.logger.log(`Client subscribed to order ${orderId} (total: ${this.clients.get(key).size})`);
	}

	/**
	 * Unsubscribe client from order updates
	 */
	unsubscribe(orderId: number, client: WebSocket): void {
		const key = `order:${orderId}`;
		const subscribers = this.clients.get(key);

		if (subscribers) {
			subscribers.delete(client);

			if (subscribers.size === 0) {
				this.clients.delete(key);
			}

			this.logger.log(`Client unsubscribed from order ${orderId}`);
		}
	}

	/**
	 * Subscribe client to stats updates
	 */
	subscribeToStats(client: WebSocket): void {
		this.statsClients.add(client);
		this.logger.log(`Client subscribed to stats (total: ${this.statsClients.size})`);
	}

	/**
	 * Unsubscribe client from stats updates
	 */
	unsubscribeFromStats(client: WebSocket): void {
		this.statsClients.delete(client);
		this.logger.log(`Client unsubscribed from stats`);
	}

	/**
	 * Remove all subscriptions for a client
	 */
	removeClient(client: WebSocket): void {
		// Remove from order subscriptions
		for (const [key, subscribers] of this.clients.entries()) {
			subscribers.delete(client);

			if (subscribers.size === 0) {
				this.clients.delete(key);
			}
		}

		// Remove from stats subscriptions
		this.statsClients.delete(client);

		this.logger.log('Client removed from all subscriptions');
	}

	/**
	 * Send message to all clients subscribed to an order
	 */
	private sendToOrder(orderId: number, message: string): void {
		const key = `order:${orderId}`;
		const subscribers = this.clients.get(key);

		if (!subscribers || subscribers.size === 0) {
			return;
		}

		let sent = 0;

		subscribers.forEach((client) => {
			if (client.readyState === 1) { // WebSocket.OPEN
				try {
					client.send(message);
					sent++;
				} catch (error) {
					this.logger.error(`Failed to send message to client: ${error}`);
				}
			}
		});

		this.logger.debug(`Sent message to ${sent}/${subscribers.size} clients for order ${orderId}`);
	}

	/**
	 * Send queue position update
	 */
	sendQueuePosition(orderId: number, position: number, queueType: string): void {
		const event = OrderQueueEvent.create(orderId, position, queueType);
		const wsMessage = WebSocketMessage.create(WebSocketEvent.ORDER_QUEUE, event);
		this.sendToOrder(orderId, JSON.stringify(wsMessage));
	}

	/**
	 * Send progress update
	 */
	sendProgress(orderId: number, processedUrls: number, totalUrls: number, stage: 'processing' | 'generating_description'): void {
		const percentage = totalUrls > 0 ? Math.round((processedUrls / totalUrls) * 100) : 0;
		const event = OrderProgressEvent.create(orderId, processedUrls, totalUrls, stage, percentage);
		const wsMessage = WebSocketMessage.create(WebSocketEvent.ORDER_PROGRESS, event);
		this.sendToOrder(orderId, JSON.stringify(wsMessage));
	}

	/**
	 * Send completion update
	 */
	sendCompletion(orderId: number, status: OrderStatus): void {
		const event = OrderCompletionEvent.create(orderId, status);
		const wsMessage = WebSocketMessage.create(WebSocketEvent.ORDER_COMPLETION, event);
		this.sendToOrder(orderId, JSON.stringify(wsMessage));
	}

	/**
	 * Broadcast stats update to all stats subscribers
	 */
	broadcastStatsUpdate(count: number): void {
		if (this.statsClients.size === 0) {
			return;
		}

		const event = StatsUpdateEvent.create(count);
		const wsMessage = WebSocketMessage.create(WebSocketEvent.STATS_UPDATE, event);
		const message = JSON.stringify(wsMessage);
		let sent = 0;

		this.statsClients.forEach((client) => {
			if (client.readyState === 1) { // WebSocket.OPEN
				try {
					client.send(message);
					sent++;
				} catch (error) {
					this.logger.error(`Failed to send stats update: ${error}`);
				}
			}
		});

		this.logger.debug(`Sent stats update to ${sent}/${this.statsClients.size} clients`);
	}
}

export { WebSocketService };
