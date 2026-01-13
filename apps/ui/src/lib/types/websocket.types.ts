/**
 * Re-export shared WebSocket event classes from backend
 */
export { GenerationRequestUpdateEvent } from '@api/shared';
export type { GenerationRequestDtoResponse } from '@api/shared';

/**
 * WebSocket Message Formats
 */

export interface WebSocketMessage<T = unknown> {
	type: string;
	payload?: T;
}

export interface SubscribeMessage extends WebSocketMessage {
	type: 'subscribe';
	payload: { generationIds: number[] };
}

export interface UnsubscribeMessage extends WebSocketMessage {
	type: 'unsubscribe';
	payload: { generationIds: number[] };
}

export interface RequestUpdateMessage extends WebSocketMessage {
	type: 'generation:request:update';
	payload: {
		generationRequest: unknown;
		processedUrls?: number;
	};
}

/**
 * WebSocket Event Listeners
 */
export type RequestUpdateListener = (event: RequestUpdateMessage['payload']) => void;
export type ConnectListener = () => void;
export type DisconnectListener = () => void;
export type ErrorListener = (error: Error) => void;
