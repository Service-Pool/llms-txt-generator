import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { type FastifyInstance, type FastifyRequest } from 'fastify';
import { type RawData, type WebSocket } from 'ws';
import { AppConfigService } from '../config/config.service';
import { SessionAuthService } from './services/session-auth.service';
import { RoomManagerService } from './services/room-manager.service';
import { MessageHandlerService, WebSocketMessage } from './services/message-handler.service';

@Injectable()
class WebSocketGateway implements OnModuleInit {
	private readonly logger = new Logger(WebSocketGateway.name);

	constructor(
		private readonly configService: AppConfigService,
		private readonly adapterHost: HttpAdapterHost,
		private readonly sessionAuth: SessionAuthService,
		private readonly roomManager: RoomManagerService,
		private readonly messageHandler: MessageHandlerService
	) {}

	onModuleInit() {
		const httpAdapter = this.adapterHost.httpAdapter;
		const instance = httpAdapter.getInstance<FastifyInstance>();

		const handleConnection = async (socket: WebSocket, req: FastifyRequest) => {
			this.logger.log('WebSocket connection established');

			const sessionData = await this.sessionAuth.extractSession(req);

			if (!sessionData) {
				this.logger.warn('WebSocket connection rejected: no valid session');
				socket.close();
				return;
			}

			this.logger.log(`WebSocket authenticated: userId=${sessionData.userId}, sessionId=${sessionData.sessionId}`);

			const handleMessage = (message: RawData) => {
				const messageStr = this.convertRawDataToString(message);
				this.logger.log(`Raw message received: ${messageStr}`);
				try {
					const data = JSON.parse(messageStr) as WebSocketMessage;
					this.messageHandler.handleMessage(socket, data, sessionData).catch((err: Error) => {
						this.logger.error('Error in handleMessage:', err);
					});
				} catch (error) {
					this.logger.error('Error parsing WebSocket message:', error);
				}
			};

			const handleClose = (code: number, reason: string) => {
				this.logger.log(`WebSocket closing: code=${code}, reason=${reason}`);
				this.roomManager.cleanup(socket);
			};

			socket.on('message', handleMessage);
			socket.on('close', handleClose);

			this.logger.log('WebSocket handlers registered, ready to receive messages');
		};

		instance.get(this.configService.websocket.path, { websocket: true }, handleConnection);

		this.logger.log(`WebSocket gateway initialized on path: ${this.configService.websocket.path}`);
	}

	private convertRawDataToString(data: RawData): string {
		if (Buffer.isBuffer(data)) {
			return data.toString('utf8');
		}
		if (data instanceof ArrayBuffer) {
			return Buffer.from(data).toString('utf8');
		}
		if (Array.isArray(data)) {
			return Buffer.concat(data).toString('utf8');
		}
		return '';
	}
}

export { WebSocketGateway };
