import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../auth/entitites/session.entity';
import { AppConfigService } from '../config/config.service';
import { GenerationRequest } from '../generations/entities/generation-request.entity';

class SocketData {
	constructor(
		public readonly userId: number | null,
		public readonly sessionId: string
	) {}
}

class SubscribePayload {
	constructor(public readonly generationIds: number[]) {}
}

class GenerationProgressEvent {
	constructor(
		public readonly generationId: number,
		public readonly status: string,
		public readonly processedUrls: number,
		public readonly totalUrls: number
	) {}
}

class GenerationStatusEvent {
	constructor(
		public readonly generationId: number,
		public readonly status: string,
		public readonly content?: string,
		public readonly errorMessage?: string,
		public readonly entriesCount?: number
	) {}
}

@WebSocketGateway({
	path: process.env.SOCKET_PATH,
	cors: {
		origin: process.env.CORS_ORIGIN,
		credentials: true
	}
})
class AppWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server: Server;

	private readonly logger = new Logger(AppWebSocketGateway.name);

	constructor(
		@InjectRepository(Session) private readonly sessionRepository: Repository<Session>,
		@InjectRepository(GenerationRequest) private readonly generationRequestRepository: Repository<GenerationRequest>,
		private readonly configService: AppConfigService
	) {}

	async handleConnection(client: Socket) {
		const sessionData = await this.extractSession(client);

		if (!sessionData) {
			this.logger.warn(`Client ${client.id} disconnected: invalid or missing session`);
			client.disconnect();
			return;
		}

		// Save session data in socket for later use
		client.data = new SocketData(sessionData.userId, sessionData.sessionId);

		this.logger.log(`Client connected: ${client.id} (userId: ${sessionData.userId || 'anonymous'}, sessionId: ${sessionData.sessionId})`);
	}

	private async extractSession(client: Socket): Promise<{ userId: number | null; sessionId: string } | null> {
		const cookies = client.handshake.headers.cookie;
		if (!cookies) {
			return null;
		}

		const sessionId = this.parseCookie(cookies, this.configService.session.cookieName);
		if (!sessionId) {
			return null;
		}

		// Check session in database
		const session = await this.sessionRepository.findOne({ where: { sid: sessionId } });
		if (!session) {
			return null;
		}

		// Get user ID from session data (TypeORM auto-deserializes JSON)
		const userId = session.sess.userId || null;

		return { userId, sessionId };
	}

	private parseCookie(cookieString: string, cookieName: string): string | null {
		const cookies = cookieString.split(';').map(c => c.trim());
		for (const cookie of cookies) {
			const [name, value] = cookie.split('=');
			if (name === cookieName) {
				let decodedValue = decodeURIComponent(value);

				// Handle signed cookie format: s:value.signature
				if (decodedValue.startsWith('s:')) {
					const dotIndex = decodedValue.indexOf('.', 2);
					if (dotIndex !== -1) {
						decodedValue = decodedValue.substring(2, dotIndex);
					}
				}

				return decodedValue;
			}
		}
		return null;
	}

	handleDisconnect(client: Socket) {
		this.logger.log(`Client disconnected: ${client.id}`);
	}

	@SubscribeMessage('subscribe')
	async handleSubscribe(@ConnectedSocket() client: Socket, @MessageBody() payload: SubscribePayload): Promise<void> {
		const { generationIds } = payload;
		const socketData = client.data as SocketData;
		const userId = socketData.userId;
		const sessionId = socketData.sessionId;

		for (const id of generationIds) {
			// Check if user has access to this generation
			const hasAccess = await this.checkGenerationAccess(id, userId, sessionId);
			if (!hasAccess) {
				this.logger.warn(`Client ${client.id} denied access to generation ${id}`);
				continue;
			}

			const room = `generation-${id}`;
			await client.join(room);
			this.logger.log(`Client ${client.id} subscribed to ${room}`);
		}
	}

	private async checkGenerationAccess(generationId: number, userId: number | null, sessionId: string): Promise<boolean> {
		const whereCondition = userId
			? { generationId, userId }
			: { generationId, sessionId };

		const request = await this.generationRequestRepository.findOne({ where: whereCondition });
		return request !== null;
	}

	@SubscribeMessage('unsubscribe')
	async handleUnsubscribe(@ConnectedSocket() client: Socket, @MessageBody() payload: SubscribePayload): Promise<void> {
		const { generationIds } = payload;

		for (const id of generationIds) {
			const room = `generation-${id}`;
			await client.leave(room);
			this.logger.log(`Client ${client.id} unsubscribed from ${room}`);
		}
	}

	@OnEvent('generation.progress')
	handleGenerationProgress(payload: GenerationProgressEvent): void {
		const room = `generation-${payload.generationId}`;
		this.server.to(room).emit('generation:progress', payload);
		this.logger.log(`Progress update sent to ${room}: ${payload.processedUrls}/${payload.totalUrls}`);
	}

	@OnEvent('generation.status')
	handleGenerationStatus(payload: GenerationStatusEvent): void {
		const room = `generation-${payload.generationId}`;
		this.server.to(room).emit('generation:status', payload);
		this.logger.log(`Status update sent to ${room}: ${payload.status}`);
	}
}

export { GenerationProgressEvent, GenerationStatusEvent, AppWebSocketGateway };
