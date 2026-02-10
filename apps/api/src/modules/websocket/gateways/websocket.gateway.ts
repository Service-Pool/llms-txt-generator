import { AppConfigService } from '../../../config/config.service';
import { HttpAdapterHost } from '@nestjs/core';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from '../../orders/entities/order.entity';
import { Repository } from 'typeorm';
import { Session } from '../../auth/entities/session.entity';
import { StatsService } from '../../stats/services/stats.service';
import { StatsUpdateEvent, WebSocketResponse } from '../websocket.events';
import { type FastifyInstance, type FastifyRequest } from 'fastify';
import { type WebSocket } from 'ws';
import { WebSocketEvent } from '../../../enums/websocket-event.enum';
import { WebSocketService } from '../services/websocket.service';

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

	// WebSocket action constants
	private static readonly ACTION_SUBSCRIBE = 'subscribe';
	private static readonly ACTION_UNSUBSCRIBE = 'unsubscribe';

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

		// Register orders WebSocket endpoint
		const ordersPath = `${this.configService.websocket.path}/orders`;
		instance.get(ordersPath, { websocket: true }, async (socket: WebSocket, request: FastifyRequest) => {
			await this.handleOrdersWebSocket(socket, request);
		});
		this.logger.log(`WebSocket endpoint registered: ${ordersPath}`);

		// Register stats WebSocket endpoint
		const statsPath = `${this.configService.websocket.path}/stats`;
		instance.get(statsPath, { websocket: true }, async (socket: WebSocket, request: FastifyRequest) => {
			await this.handleStatsWebSocket(socket, request);
		});
		this.logger.log(`WebSocket endpoint registered: ${statsPath}`);
	}

	/**
	 * WebSocket endpoint for order updates
	 * {websocket.path}/orders
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
	 * {websocket.path}/stats
	 */
	private async handleStatsWebSocket(socket: WebSocket, request: FastifyRequest): Promise<void> {
		// Authenticate connection
		const sessionData = await this.authenticateConnection(socket, request);
		if (!sessionData) return;

		// Handle incoming messages
		socket.on('message', (message: Buffer) => {
			this.handleStatsMessage(socket, message, sessionData).catch((error: Error) => {
				this.logger.error(`Unhandled stats message error: ${error.message}`);
			});
		});

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
	 * Handle incoming WebSocket message for stats
	 */
	private async handleStatsMessage(socket: WebSocket, message: Buffer, _sessionData: SessionData): Promise<void> {
		try {
			const data = JSON.parse(message.toString()) as { action?: string };

			switch (data.action) {
				case WebSocketGateway.ACTION_SUBSCRIBE: {
					// Subscribe to stats updates
					this.wsService.subscribeToStats(socket);

					// Send current stats immediately
					const count = await this.statsService.getCompletedCount();
					const statsEvent = StatsUpdateEvent.create(count);
					const statsMessage = WebSocketResponse.create(WebSocketEvent.STATS_UPDATE, statsEvent);
					socket.send(JSON.stringify(statsMessage));
					break;
				}

				case WebSocketGateway.ACTION_UNSUBSCRIBE: {
					this.wsService.unsubscribeFromStats(socket);
					break;
				}

				default:
					throw new Error(`Unknown action: ${data.action}`);
			}
		} catch (error) {
			this.logger.error(`Error processing stats WebSocket message: ${error}`, error);
			socket.send(JSON.stringify({
				event: 'error',
				data: { message: 'Invalid message format' }
			}));
		}
	}

	private async handleOrderMessage(socket: WebSocket, message: Buffer, sessionData: SessionData): Promise<void> {
		try {
			const data = JSON.parse(message.toString()) as {
				action?: string;
				orderIds?: number[];
			};

			const orders = data.orderIds;

			if (!orders.length) {
				throw new Error('orderIds array is required for subscribe/unsubscribe action');
			}

			switch (data.action) {
				case WebSocketGateway.ACTION_SUBSCRIBE: {
					// Subscribe to multiple orders
					for (const orderId of orders) {
						// Verify ownership before subscribing
						const hasAccess = await this.checkOrderAccess(
							orderId,
							sessionData.userId,
							sessionData.sessionId
						);

						if (hasAccess) {
							// User has access to this order
							this.wsService.subscribe(orderId, socket);
						} else {
							// Access denied
							socket.send(JSON.stringify({
								event: 'error',
								data: {
									message: 'Access denied: Order not found or you don\'t have permission',
									orderId: orderId
								}
							}));
							this.logger.warn(`Unauthorized subscribe attempt to order ${orderId} by userId=${sessionData.userId}`);
						}
					}
					break;
				}

				case WebSocketGateway.ACTION_UNSUBSCRIBE: {
					// Unsubscribe from multiple orders
					for (const orderId of orders) {
						this.wsService.unsubscribe(orderId, socket);
					}
					break;
				}

				default:
					throw new Error(`Unknown action: ${data.action}`);
			}
		} catch (error) {
			this.logger.error(`Error processing WebSocket message: ${error}`, error);
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
