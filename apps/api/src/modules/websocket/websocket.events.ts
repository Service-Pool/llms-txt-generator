/**
 * WebSocket Events
 * Shared between backend and frontend
 */

class GenerationProgressEvent {
	constructor(
		public readonly generationId: number,
		public readonly status: string,
		public readonly processedUrls: number,
		public readonly totalUrls: number
	) { }
}

class GenerationStatusEvent {
	constructor(
		public readonly generationId: number,
		public readonly status: string,
		public readonly content?: string,
		public readonly errorMessage?: string,
		public readonly entriesCount?: number
	) { }
}

class GenerationRequestStatusEvent {
	constructor(
		public readonly generationId: number,
		public readonly requestStatus: number
	) { }
}

class WebSocketMessage {
	constructor(
		public readonly type: string,
		public readonly payload?: {
			generationIds?: number[];
		}
	) { }
}

export { GenerationProgressEvent, GenerationStatusEvent, GenerationRequestStatusEvent, WebSocketMessage };
