import { WebSocketEvent } from '@/enums/websocket-event.enum';
import { type Deserializable } from '@/utils/response/types';

/**
 * WebSocket Events
 * Типы событий для real-time обновлений
 */

/**
 * Order Queue Position Event
 * Отправляется когда обновляется позиция заказа в очереди
 */
class OrderQueueEvent {
	orderId: number;
	position: number;
	queueType: string;

	static create(orderId: number, position: number, queueType: string): OrderQueueEvent {
		const event = new OrderQueueEvent();
		event.orderId = orderId;
		event.position = position;
		event.queueType = queueType;
		return event;
	}

	static fromJSON(json: Record<string, unknown>): OrderQueueEvent {
		const dto = new OrderQueueEvent();
		dto.orderId = json.orderId as number;
		dto.position = json.position as number;
		dto.queueType = json.queueType as string;
		return dto;
	}
}

/**
 * Stats Update Event
 * Отправляется при изменении статистики (например, при завершении заказа)
 */
class StatsUpdateEvent {
	count: number;

	static create(count: number): StatsUpdateEvent {
		const event = new StatsUpdateEvent();
		event.count = count;
		return event;
	}

	static fromJSON(json: Record<string, unknown>): StatsUpdateEvent {
		const event = new StatsUpdateEvent();
		event.count = (json.count as number) || 0;
		return event;
	}
}

/**
 * WebSocket Response class
 * Used on both backend (with DI) and frontend (for deserialization)
 *
 * Analogue of ApiResponse for WebSocket communications
 * All syntax must be compatible with ES6
 */
class WebSocketResponse<T = unknown> {
	private event: WebSocketEvent;
	private data: T;

	private constructor(event: WebSocketEvent) {
		this.event = event;
	}

	public getEvent(): WebSocketEvent {
		return this.event;
	}

	public getData(): T {
		return this.data;
	}

	/**
	 * Create WebSocket response
	 */
	public static create<T>(event: WebSocketEvent, data: T): WebSocketResponse<T> {
		const response = new WebSocketResponse<T>(event);
		response.data = data;
		return response;
	}

	/**
	 * Deserialize from JSON
	 */
	public static fromJSON<T>(json: Record<string, unknown>, DataClass?: Deserializable<T>): WebSocketResponse<T> {
		const eventStr = json.event as string;
		const event = Object.values(WebSocketEvent).find(e => e === eventStr as WebSocketEvent) as WebSocketEvent;
		const response = new WebSocketResponse<T>(event);

		if (json.data !== undefined) {
			response.data = DataClass ? DataClass.fromJSON(json.data) : (json.data as T);
		}

		return response;
	}
}

// Export
export { WebSocketEvent, OrderQueueEvent, StatsUpdateEvent, WebSocketResponse };
