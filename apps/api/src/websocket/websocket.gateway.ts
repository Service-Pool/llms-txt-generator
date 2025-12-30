import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { HttpAdapterHost } from '@nestjs/core';
import { type FastifyInstance, type FastifyRequest } from 'fastify';
import { type RawData, type WebSocket } from 'ws';
import { Session } from '../auth/entitites/session.entity';
import { GenerationRequest } from '../generations/entities/generation-request.entity';
import { AppConfigService } from '../config/config.service';
import { GenerationProgressEvent, GenerationStatusEvent } from './events';

class WebSocketMessage {
	constructor(
		public readonly type: string,
		public readonly payload?: {
			generationIds?: number[];
		}
	) {}
}

class SessionData {
	constructor(
		public readonly userId: number | null,
		public readonly sessionId: string
	) {}
}

@Injectable()
class WebSocketGateway implements OnModuleInit {
	private readonly logger = new Logger(WebSocketGateway.name);
	private clients: Map<string, Set<WebSocket>> = new Map();
	private socketRooms: Map<WebSocket, Set<string>> = new Map();

	constructor(
		@InjectRepository(Session) private readonly sessionRepository: Repository<Session>,
		@InjectRepository(GenerationRequest) private readonly generationRequestRepository: Repository<GenerationRequest>,
		private readonly configService: AppConfigService,
		private readonly adapterHost: HttpAdapterHost
	) {}

	onModuleInit() {
		const instance = this.adapterHost.httpAdapter.getInstance<FastifyInstance>();

		const handleConnection = async (socket: WebSocket, req: FastifyRequest) => {
			const sessionData = await this.authenticateConnection(socket, req);
			if (!sessionData) return;

			socket.on('message', (message: RawData) => {
				this
					.handleMessage(socket, message, sessionData)
					.catch((err: Error) => {
						this.logger.error('Unhandled message error:', err);
					});
			});

			socket.on('close', () => {
				this.handleDisconnect(socket);
			});

			this.logger.log('WebSocket ready');
		};

		instance.get(this.configService.websocket.path, { websocket: true }, handleConnection);
		this.logger.log(`WebSocket initialized: ${this.configService.websocket.path}`);
	}

	// Connection & Auth
	private async authenticateConnection(socket: WebSocket, req: FastifyRequest): Promise<SessionData | null> {
		this.logger.log('Connection established');

		const sessionData = await this.extractSession(req);
		if (!sessionData) {
			this.logger.warn('Rejected: no valid session');
			socket.close();
			return null;
		}

		this.logger.log(`Authenticated: userId=${sessionData.userId}`);
		return sessionData;
	}

	private async extractSession(req: FastifyRequest): Promise<SessionData | null> {
		const cookies = req.headers.cookie;
		if (!cookies) return null;

		const sessionId = this.parseCookie(cookies, this.configService.session.cookieName);
		if (!sessionId) return null;

		const session = await this.sessionRepository.findOne({ where: { sid: sessionId } });
		if (!session) return null;

		return new SessionData(session.sess.userId || null, sessionId);
	}

	private parseCookie(cookieString: string, cookieName: string): string | null {
		const cookies = cookieString.split(';').map(c => c.trim());
		for (const cookie of cookies) {
			const [name, value] = cookie.split('=');
			if (name === cookieName) {
				let decoded = decodeURIComponent(value);
				if (decoded.startsWith('s:')) decoded = decoded.substring(2);
				const dotIndex = decoded.indexOf('.');
				if (dotIndex !== -1) decoded = decoded.substring(0, dotIndex);
				return decoded;
			}
		}
		return null;
	}

	// Message Handling
	private async handleMessage(socket: WebSocket, message: RawData, sessionData: SessionData): Promise<void> {
		try {
			const messageStr = this.rawDataToString(message);
			const data = JSON.parse(messageStr) as WebSocketMessage;

			if (data.type === 'subscribe' && data.payload?.generationIds) {
				await this.handleSubscribe(socket, data.payload.generationIds, sessionData);
			} else if (data.type === 'unsubscribe' && data.payload?.generationIds) {
				this.handleUnsubscribe(socket, data.payload.generationIds);
			}
		} catch (error) {
			this.logger.error('Message error:', error);
		}
	}

	private async handleSubscribe(socket: WebSocket, generationIds: number[], sessionData: SessionData): Promise<void> {
		for (const id of generationIds) {
			const hasAccess = await this.checkAccess(id, sessionData.userId, sessionData.sessionId);
			if (hasAccess) {
				this.subscribeToRoom(socket, `generation-${id}`);
			} else {
				this.logger.warn(`Access denied: generation ${id}`);
			}
		}
	}

	private handleUnsubscribe(socket: WebSocket, generationIds: number[]): void {
		for (const id of generationIds) {
			this.unsubscribeFromRoom(socket, `generation-${id}`);
		}
	}

	private async checkAccess(generationId: number, userId: number | null, sessionId: string): Promise<boolean> {
		const where = userId ? { generationId, userId } : { generationId, sessionId };
		const request = await this.generationRequestRepository.findOne({ where });
		return request !== null;
	}

	// Room Management
	private subscribeToRoom(socket: WebSocket, room: string): void {
		if (!this.clients.has(room)) this.clients.set(room, new Set());
		this.clients.get(room)!.add(socket);

		if (!this.socketRooms.has(socket)) this.socketRooms.set(socket, new Set());
		this.socketRooms.get(socket)!.add(room);

		this.logger.log(`Subscribed: ${room}`);
	}

	private unsubscribeFromRoom(socket: WebSocket, room: string): void {
		this.clients.get(room)?.delete(socket);
		this.socketRooms.get(socket)?.delete(room);
		this.logger.log(`Unsubscribed: ${room}`);
	}

	private handleDisconnect(socket: WebSocket): void {
		const rooms = this.socketRooms.get(socket);
		if (rooms) {
			for (const room of rooms) {
				const clients = this.clients.get(room);
				if (clients) {
					clients.delete(socket);
					if (clients.size === 0) this.clients.delete(room);
				}
			}
			this.socketRooms.delete(socket);
		}
		this.logger.log('Disconnected');
	}

	// Broadcasting
	private broadcast(room: string, message: unknown): void {
		const clients = this.clients.get(room);
		if (clients && clients.size > 0) {
			const messageStr = JSON.stringify(message);
			for (const socket of clients) {
				try {
					socket.send(messageStr);
				} catch (error) {
					this.logger.error('Broadcast error:', error);
				}
			}
			this.logger.log(`Broadcast: ${room} (${clients.size} clients)`);
		}
	}

	// Event Handlers
	@OnEvent('generation.progress')
	handleGenerationProgress(event: GenerationProgressEvent): void {
		this.broadcast(`generation-${event.generationId}`, {
			type: 'generation:progress',
			payload: event
		});
	}

	@OnEvent('generation.status')
	handleGenerationStatus(event: GenerationStatusEvent): void {
		this.broadcast(`generation-${event.generationId}`, {
			type: 'generation:status',
			payload: event
		});
	}

	// Helpers
	private rawDataToString(data: RawData): string {
		if (Buffer.isBuffer(data)) return data.toString('utf8');
		if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
		if (Array.isArray(data)) return Buffer.concat(data).toString('utf8');
		return '';
	}
}

export { WebSocketGateway };
