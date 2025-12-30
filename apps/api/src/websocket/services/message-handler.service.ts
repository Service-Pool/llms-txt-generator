import { Injectable, Logger } from '@nestjs/common';
import { type WebSocket } from 'ws';
import { SessionAuthService, SessionData } from './session-auth.service';
import { RoomManagerService } from './room-manager.service';

class WebSocketMessage {
	constructor(
		public readonly type: string,
		public readonly payload?: {
			generationIds?: number[];
		}
	) {}
}

@Injectable()
class MessageHandlerService {
	private readonly logger = new Logger(MessageHandlerService.name);

	constructor(
		private readonly sessionAuth: SessionAuthService,
		private readonly roomManager: RoomManagerService
	) {}

	async handleMessage(socket: WebSocket, data: WebSocketMessage, sessionData: SessionData): Promise<void> {
		const { type, payload } = data;
		this.logger.log(`Received message: type=${type}, payload=${JSON.stringify(payload)}`);

		if (type === 'subscribe' && payload?.generationIds) {
			await this.handleSubscribe(socket, payload.generationIds, sessionData);
		} else if (type === 'unsubscribe' && payload?.generationIds) {
			this.handleUnsubscribe(socket, payload.generationIds);
		}
	}

	private async handleSubscribe(socket: WebSocket, generationIds: number[], sessionData: SessionData): Promise<void> {
		for (const id of generationIds) {
			const hasAccess = await this.sessionAuth.checkGenerationAccess(
				id,
				sessionData.userId,
				sessionData.sessionId
			);

			if (hasAccess) {
				const room = `generation-${id}`;
				this.roomManager.subscribeToRoom(socket, room);
			} else {
				this.logger.warn(`Client denied access to generation ${id}`);
			}
		}
	}

	private handleUnsubscribe(socket: WebSocket, generationIds: number[]): void {
		for (const id of generationIds) {
			const room = `generation-${id}`;
			this.roomManager.unsubscribeFromRoom(socket, room);
		}
	}
}

export { MessageHandlerService, WebSocketMessage };
