import type {
	RequestUpdateListener,
	ConnectListener,
	DisconnectListener,
	ErrorListener,
	WebSocketMessage,
	RequestUpdateMessage,
	GenerationRequestUpdateEvent
} from '../types/websocket.types';

/**
 * WebSocket Service Singleton
 * Manages WebSocket connection and real-time updates for generations
 */
export class WebSocketService {
	private static instance: WebSocketService | null = null;
	private ws: WebSocket | null = null;
	private url: string;
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectDelay = 1000;
	private subscribedGenerationIds = new Set<number>();

	// Event listeners
	private requestUpdateListeners = new Set<RequestUpdateListener>();
	private connectListeners = new Set<ConnectListener>();
	private disconnectListeners = new Set<DisconnectListener>();
	private errorListeners = new Set<ErrorListener>();

	private constructor(url: string) {
		this.url = url;
	}

	/**
	 * Get singleton instance
	 */
	public static getInstance(url?: string): WebSocketService {
		if (!WebSocketService.instance) {
			if (!url) {
				throw new Error('WebSocket URL is required for first initialization');
			}
			WebSocketService.instance = new WebSocketService(url);
		}
		return WebSocketService.instance;
	}

	/**
	 * Connect to WebSocket server
	 */
	public connect(): void {
		if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
			return;
		}

		try {
			this.ws = new WebSocket(this.url);

			this.ws.onopen = () => {
				this.reconnectAttempts = 0;
				this.notifyConnectListeners();

				// Resubscribe to all generation IDs after reconnect
				if (this.subscribedGenerationIds.size > 0) {
					this.subscribe(Array.from(this.subscribedGenerationIds));
				}
			};

			this.ws.onmessage = (event: MessageEvent) => {
				this.handleMessage(event.data as string);
			};

			this.ws.onerror = (_event: Event) => {
				const error = new Error('WebSocket error occurred');
				this.notifyErrorListeners(error);
			};

			this.ws.onclose = (_event: CloseEvent) => {
				this.notifyDisconnectListeners();
				this.scheduleReconnect();
			};
		} catch (error) {
			const wsError = error instanceof Error ? error : new Error('Failed to connect to WebSocket');
			this.notifyErrorListeners(wsError);
		}
	}

	/**
	 * Disconnect from WebSocket server
	 */
	public disconnect(): void {
		this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect

		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}

		this.subscribedGenerationIds.clear();
	}

	/**
	 * Subscribe to generation updates
	 */
	public subscribe(generationIds: number[]): void {
		generationIds.forEach(id => this.subscribedGenerationIds.add(id));

		if (this.ws?.readyState === WebSocket.OPEN) {
			this.send({
				type: 'subscribe',
				payload: { generationIds }
			});
		} else {
			console.warn('[WS] Not connected, state:', this.ws?.readyState);
		}
	}

	/**
	 * Unsubscribe from generation updates
	 */
	public unsubscribe(generationIds: number[]): void {
		generationIds.forEach(id => this.subscribedGenerationIds.delete(id));

		if (this.ws?.readyState === WebSocket.OPEN) {
			this.send({
				type: 'unsubscribe',
				payload: { generationIds }
			});
		}
	}

	/**
	 * Add event listener
	 */
	public on(
		event: 'update' | 'connect' | 'disconnect' | 'error',
		listener: (...args: unknown[]) => void
	): void {
		switch (event) {
			case 'update':
				this.requestUpdateListeners.add(listener as RequestUpdateListener);
				break;
			case 'connect':
				this.connectListeners.add(listener as ConnectListener);
				break;
			case 'disconnect':
				this.disconnectListeners.add(listener as DisconnectListener);
				break;
			case 'error':
				this.errorListeners.add(listener as ErrorListener);
				break;
		}
	}

	/**
	 * Remove event listener
	 */
	public off(
		event: 'update' | 'connect' | 'disconnect' | 'error',
		listener: (...args: unknown[]) => void
	): void {
		switch (event) {
			case 'update':
				this.requestUpdateListeners.delete(listener as RequestUpdateListener);
				break;
			case 'connect':
				this.connectListeners.delete(listener as ConnectListener);
				break;
			case 'disconnect':
				this.disconnectListeners.delete(listener as DisconnectListener);
				break;
			case 'error':
				this.errorListeners.delete(listener as ErrorListener);
				break;
		}
	}

	/**
	 * Get current connection state
	 */
	public get isConnected(): boolean {
		return this.ws?.readyState === WebSocket.OPEN;
	}

	/**
	 * Get subscribed generation IDs
	 */
	public get subscriptions(): number[] {
		return Array.from(this.subscribedGenerationIds);
	}

	// Private methods

	private send(message: WebSocketMessage): void {
		if (this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(message));
		}
	}

	private handleMessage(data: string): void {
		try {
			const message = JSON.parse(data) as RequestUpdateMessage;

			switch (message.type) {
				case 'generation:request:update':
					if (message.payload) {
						this.notifyRequestUpdateListeners(message.payload);
					}
					break;
			}
		} catch (error) {
			const parseError = error instanceof Error ? error : new Error('Failed to parse WebSocket message');
			this.notifyErrorListeners(parseError);
		}
	}

	private scheduleReconnect(): void {
		if (this.reconnectAttempts < this.maxReconnectAttempts) {
			this.reconnectAttempts++;
			const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

			setTimeout(() => {
				this.connect();
			}, delay);
		}
	}

	private notifyRequestUpdateListeners(event: RequestUpdateMessage['payload']): void {
		this.requestUpdateListeners.forEach((listener) => {
			try {
				if (event) {
					const fn = listener as unknown as (event: GenerationRequestUpdateEvent) => void;
					fn(event as unknown as GenerationRequestUpdateEvent);
				}
			} catch (error) {
				console.error('Error in request update listener:', error);
			}
		});
	}

	private notifyConnectListeners(): void {
		this.connectListeners.forEach((listener) => {
			try {
				listener();
			} catch (error) {
				console.error('Error in connect listener:', error);
			}
		});
	}

	private notifyDisconnectListeners(): void {
		this.disconnectListeners.forEach((listener) => {
			try {
				listener();
			} catch (error) {
				console.error('Error in disconnect listener:', error);
			}
		});
	}

	private notifyErrorListeners(error: Error): void {
		this.errorListeners.forEach((listener) => {
			try {
				listener(error);
			} catch (err) {
				console.error('Error in error listener:', err);
			}
		});
	}
}
