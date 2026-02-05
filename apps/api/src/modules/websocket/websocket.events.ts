import { WebSocketEvent } from '../../enums/websocket-event.enum';

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
 * Order Progress Event
 * Отправляется при обработке каждого батча страниц
 */
class OrderProgressEvent {
	orderId: number;
	processedUrls: number;
	totalUrls: number;
	stage: 'processing' | 'generating_description';
	percentage: number;

	static create(orderId: number, processedUrls: number, totalUrls: number, stage: 'processing' | 'generating_description', percentage: number): OrderProgressEvent {
		const event = new OrderProgressEvent();
		event.orderId = orderId;
		event.processedUrls = processedUrls;
		event.totalUrls = totalUrls;
		event.stage = stage;
		event.percentage = percentage;
		return event;
	}

	static fromJSON(json: Record<string, unknown>): OrderProgressEvent {
		const event = new OrderProgressEvent();
		event.orderId = json.orderId as number;
		event.processedUrls = json.processedUrls as number;
		event.totalUrls = json.totalUrls as number;
		event.stage = json.stage as 'processing' | 'generating_description';
		event.percentage = json.percentage as number;
		return event;
	}
}

/**
 * Order Completion Event
 * Отправляется при завершении обработки заказа (успех или ошибка)
 */
class OrderCompletionEvent {
	orderId: number;
	status: string; // OrderStatus enum value

	static create(orderId: number, status: string): OrderCompletionEvent {
		const event = new OrderCompletionEvent();
		event.orderId = orderId;
		event.status = status;
		return event;
	}

	static fromJSON(json: Record<string, unknown>): OrderCompletionEvent {
		const event = new OrderCompletionEvent();
		event.orderId = json.orderId as number;
		event.status = json.status as string;
		return event;
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
 * Subscription Acknowledgment Event
 * Подтверждение подписки на события
 */
class SubscriptionAckEvent {
	orderId?: number;
	type?: 'stats' | 'order';

	static create(orderId?: number, type?: 'stats' | 'order'): SubscriptionAckEvent {
		const event = new SubscriptionAckEvent();
		event.orderId = orderId;
		event.type = type;
		return event;
	}

	static fromJSON(json: Record<string, unknown>): SubscriptionAckEvent {
		const event = new SubscriptionAckEvent();
		event.orderId = json.orderId as number | undefined;
		event.type = json.type as 'stats' | 'order' | undefined;
		return event;
	}
}

/**
 * WebSocket message wrapper
 */
class WebSocketMessage<T = unknown> {
	event: WebSocketEvent;
	data: T;

	static create<T>(event: WebSocketEvent, data: T): WebSocketMessage<T> {
		const message = new WebSocketMessage<T>();
		message.event = event;
		message.data = data;
		return message;
	}

	static fromJSON<T>(json: Record<string, unknown>, DataClass?: { fromJSON(json: Record<string, unknown>): T }): WebSocketMessage<T> {
		const message = new WebSocketMessage<T>();
		const eventStr = json.event as string;
		message.event = Object.values(WebSocketEvent).find(e => e === eventStr as WebSocketEvent) as WebSocketEvent;

		if (DataClass) {
			message.data = DataClass.fromJSON(json.data as Record<string, unknown>);
		} else {
			message.data = json.data as T;
		}

		return message;
	}
}

// Export
export { WebSocketEvent, OrderQueueEvent, OrderProgressEvent, OrderCompletionEvent, StatsUpdateEvent, SubscriptionAckEvent, WebSocketMessage };
