import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { GenerationProgressEvent, GenerationStatusEvent } from './events';
import { BroadcastService } from './services/broadcast.service';

@Injectable()
class WebSocketEventHandler {
	constructor(private readonly broadcast: BroadcastService) {}

	@OnEvent('generation.progress')
	handleGenerationProgress(payload: GenerationProgressEvent): void {
		const room = `generation-${payload.generationId}`;
		this.broadcast.broadcastToRoom(room, { type: 'generation:progress', payload });
	}

	@OnEvent('generation.status')
	handleGenerationStatus(payload: GenerationStatusEvent): void {
		const room = `generation-${payload.generationId}`;
		this.broadcast.broadcastToRoom(room, { type: 'generation:status', payload });
	}
}

export { WebSocketEventHandler };
