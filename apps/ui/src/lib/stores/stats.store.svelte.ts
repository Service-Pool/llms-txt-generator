import { writable } from 'svelte/store';
import { configService } from '$lib/services/config.service';
import { statsService } from '$lib/services/stats.service';
import { WebSocketMessage, StatsUpdateEvent, WebSocketEvent } from '@api/shared';

/**
 * Stats Store with WebSocket real-time updates
 */
class StatsStore {
	public readonly completedCount = writable<number | null>(null);
	private socket: WebSocket | null = null;
	private reconnectTimeout: number | null = null;
	private isInitialized = false;

	/**
	 * Initialize stats store: fetch initial value and connect to WebSocket
	 */
	async init(): Promise<void> {
		if (this.isInitialized) return;
		this.isInitialized = true;

		// Fetch initial value from REST API
		const response = await statsService.getCompleted();
		const stats = response.getData();
		this.completedCount.set(stats.count);

		// Connect to WebSocket for real-time updates
		this.connectWebSocket();
	}

	/**
	 * Connect to WebSocket endpoint
	 */
	private connectWebSocket(): void {
		const wsUrl = `${configService.websocket.url}/stats`;

		this.socket = new WebSocket(wsUrl);

		this.socket.onopen = () => {
			console.log('[StatsStore] WebSocket connected');
			if (this.reconnectTimeout) {
				clearTimeout(this.reconnectTimeout);
				this.reconnectTimeout = null;
			}
		};

		this.socket.onmessage = (event) => {
			const json = JSON.parse(event.data as string) as Record<string, unknown>;
			const message = WebSocketMessage.fromJSON(json);

			if (message.event === WebSocketEvent.STATS_UPDATE) {
				const statsEvent = StatsUpdateEvent.fromJSON(message.data as Record<string, unknown>);
				this.completedCount.set(statsEvent.count);
				console.log('[StatsStore] Updated count:', statsEvent.count);
			}
		};

		this.socket.onerror = (error) => {
			console.error('[StatsStore] WebSocket error:', error);
		};

		this.socket.onclose = () => {
			console.log('[StatsStore] WebSocket disconnected, reconnecting in 5s...');
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
	 * Destroy store: close WebSocket and cleanup
	 */
	destroy(): void {
		this.isInitialized = false;

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
export const statsStore = new StatsStore();
