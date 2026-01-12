/**
 * Re-export shared WebSocket event classes from backend
 */
export { GenerationProgressEvent, GenerationStatusEvent, GenerationRequestStatusEvent } from '@api/shared';

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

export interface ProgressMessage extends WebSocketMessage {
	type: 'generation:progress';
	payload: {
		generationId: number;
		status: string;
		processedUrls: number;
		totalUrls: number;
	};
}

export interface StatusMessage extends WebSocketMessage {
	type: 'generation:status';
	payload: {
		generationId: number;
		status: string;
		content?: string;
		errorMessage?: string;
		entriesCount?: number;
	};
}

export interface RequestStatusMessage extends WebSocketMessage {
	type: 'generation:request:status';
	payload: {
		generationId: number;
		requestStatus: number;
	};
}

/**
 * WebSocket Event Listeners
 */
export type ProgressListener = (event: ProgressMessage['payload']) => void;
export type StatusListener = (event: StatusMessage['payload']) => void;
export type RequestStatusListener = (event: RequestStatusMessage['payload']) => void;
export type ConnectListener = () => void;
export type DisconnectListener = () => void;
export type ErrorListener = (error: Error) => void;
