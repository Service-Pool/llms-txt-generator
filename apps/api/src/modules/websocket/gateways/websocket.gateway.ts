import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpAdapterHost } from '@nestjs/core';
import { WebSocketService } from '../services/websocket.service';
import { StatsService } from '../../stats/services/stats.service';
import { AppConfigService } from '../../../config/config.service';
import { Session } from '../../auth/entities/session.entity';
import { Order } from '../../orders/entities/order.entity';
import { type FastifyInstance, type FastifyRequest } from 'fastify';
import { type WebSocket } from 'ws';
import { WebSocketEvent } from '../../../enums/websocket-event.enum';
import { StatsUpdateEvent, WebSocketMessage, SubscriptionAckEvent } from '../websocket.events';

interface SessionData {
	userId: number | null;
	sessionId: string;
}

/**
 * WebSocket Gateway
 * Handles WebSocket connections using @fastify/websocket
 */
@Injectable()
class WebSocketGateway implements OnModuleInit {
	private readonly logger = new Logger(WebSocketGateway.name);

	constructor(
		private readonly wsService: WebSocketService,
		private readonly statsService: StatsService,
		private readonly configService: AppConfigService,
		private readonly adapterHost: HttpAdapterHost,
		@InjectRepository(Session) private readonly sessionRepository: Repository<Session>,
		@InjectRepository(Order) private readonly orderRepository: Repository<Order>
	) { }

	onModuleInit() {
		const instance = this.adapterHost.httpAdapter.getInstance<FastifyInstance>();

		instance.get('/ws/orders', { websocket: true }, async (socket: WebSocket, request: FastifyRequest) => {
			await this.handleOrdersWebSocket(socket, request);
		});

		instance.get('/ws/stats', { websocket: true }, async (socket: WebSocket, request: FastifyRequest) => {
			await this.handleStatsWebSocket(socket, request);
		});

		this.logger.log('WebSocket endpoints registered: /ws/orders, /ws/stats');
	}

	/**
	 * WebSocket endpoint for order updates
	 * /ws/orders
	 */
	private async handleOrdersWebSocket(socket: WebSocket, request: FastifyRequest): Promise<void> {
		// Authenticate connection
		const sessionData = await this.authenticateConnection(socket, request);
		if (!sessionData) return;

		// Handle incoming messages
		socket.on('message', (message: Buffer) => {
			this.handleOrderMessage(socket, message, sessionData).catch((error: Error) => {
				this.logger.error(`Unhandled message error: ${error.message}`);
			});
		});

		// Handle connection close
		socket.on('close', () => {
			this.logger.log('WebSocket connection closed (orders)');
			this.wsService.removeClient(socket);
		});

		// Handle errors
		socket.on('error', (error: Error) => {
			this.logger.error(`WebSocket error (orders): ${error.message}`);
			this.wsService.removeClient(socket);
		});
	}

	/**
	 * WebSocket endpoint for stats updates
	 * /ws/stats
	 */
	private async handleStatsWebSocket(socket: WebSocket, _request: FastifyRequest): Promise<void> {
		this.logger.log('New WebSocket connection for stats');

		// Auto-subscribe to stats (public endpoint)
		this.wsService.subscribeToStats(socket);

		// Send current stats immediately
		const count = await this.statsService.getCompletedCount();

		const statsEvent = StatsUpdateEvent.create(count);
		const statsMessage = WebSocketMessage.create(WebSocketEvent.STATS_UPDATE, statsEvent);
		socket.send(JSON.stringify(statsMessage));

		// Send acknowledgment
		const ackEvent = SubscriptionAckEvent.create(undefined, 'stats');
		const ackMessage = WebSocketMessage.create(WebSocketEvent.SUBSCRIPTION_ACK, ackEvent);
		socket.send(JSON.stringify(ackMessage));

		// Handle connection close
		socket.on('close', () => {
			this.logger.log('WebSocket connection closed (stats)');
			this.wsService.unsubscribeFromStats(socket);
		});

		// Handle errors
		socket.on('error', (error: Error) => {
			this.logger.error(`WebSocket error (stats): ${error.message}`);
			this.wsService.unsubscribeFromStats(socket);
		});
	}

	/**
	 * Handle incoming WebSocket message for orders
	 */
	private async handleOrderMessage(socket: WebSocket, message: Buffer, sessionData: SessionData): Promise<void> {
		try {
			const data = JSON.parse(message.toString()) as { action?: string; orderId?: number };

			if (data.action === 'subscribe' && data.orderId) {
				// Verify ownership before subscribing
				const hasAccess = await this.checkOrderAccess(
					data.orderId,
					sessionData.userId,
					sessionData.sessionId
				);

				if (hasAccess) {
					// User has access to this order
					this.wsService.subscribe(data.orderId, socket);

					// Send acknowledgment
					socket.send(JSON.stringify({
						event: 'subscribed',
						data: { orderId: data.orderId }
					}));
				} else {
					// Access denied
					socket.send(JSON.stringify({
						event: 'error',
						data: {
							message: 'Access denied: Order not found or you don\'t have permission',
							orderId: data.orderId
						}
					}));
					this.logger.warn(`Unauthorized subscribe attempt to order ${data.orderId} by userId=${sessionData.userId}`);
				}
			} else if (data.action === 'unsubscribe' && data.orderId) {
				this.wsService.unsubscribe(data.orderId, socket);

				// Send acknowledgment
				socket.send(JSON.stringify({
					event: 'unsubscribed',
					data: { orderId: data.orderId }
				}));
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			this.logger.error(`Error processing WebSocket message: ${errorMessage}`);
			socket.send(JSON.stringify({
				event: 'error',
				data: { message: 'Invalid message format' }
			}));
		}
	}

	/**
	 * Parse cookie value from cookie string
	 */
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

	/**
	 * Check if user has access to order
	 */
	private async checkOrderAccess(orderId: number, userId: number | null, sessionId: string): Promise<boolean> {
		const where = userId ? { id: orderId, userId } : { id: orderId, userId: null, sessionId };
		const order = await this.orderRepository.findOne({ where });
		return order !== null;
	}

	/**
	 * Authenticate WebSocket connection
	 */
	private async authenticateConnection(socket: WebSocket, request: FastifyRequest): Promise<SessionData | null> {
		this.logger.log('New WebSocket connection attempt');

		const sessionData = await this.extractSession(request);
		if (!sessionData) {
			this.logger.warn('Rejected: no valid session');
			socket.close();
			return null;
		}

		this.logger.log(`Authenticated: userId=${sessionData.userId}, sessionId=${sessionData.sessionId}`);
		return sessionData;
	}

	/**
	 * Extract session from request cookies
	 */
	private async extractSession(request: FastifyRequest): Promise<SessionData | null> {
		const cookies = request.headers.cookie;
		if (!cookies) return null;

		const sessionId = this.parseCookie(cookies, this.configService.session.cookieName);
		if (!sessionId) return null;

		const session = await this.sessionRepository.findOne({ where: { sessionId } });
		if (!session) return null;

		// session.data содержит объект с userId и sessionId
		return {
			userId: session.data.userId || null,
			sessionId: session.data.sessionId
		};
	}
}

export { WebSocketGateway };
