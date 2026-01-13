/**
 * WebSocket Events
 * Shared between backend and frontend
 */

import { GenerationRequestDtoResponse } from '../generations/dto/generation-response.dto';

class GenerationRequestUpdateEvent {
	constructor(
		public readonly generationRequest: GenerationRequestDtoResponse,
		public readonly processedUrls?: number
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

export { GenerationRequestUpdateEvent, WebSocketMessage };
