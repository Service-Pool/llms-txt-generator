import { Injectable, Logger } from '@nestjs/common';
import { type WebSocket } from 'ws';

@Injectable()
class RoomManagerService {
	private readonly logger = new Logger(RoomManagerService.name);
	private clients: Map<string, Set<WebSocket>> = new Map();
	private socketRooms: Map<WebSocket, Set<string>> = new Map();

	subscribeToRoom(socket: WebSocket, room: string): void {
		if (!this.clients.has(room)) {
			this.clients.set(room, new Set());
		}
		this.clients.get(room)!.add(socket);

		if (!this.socketRooms.has(socket)) {
			this.socketRooms.set(socket, new Set());
		}
		this.socketRooms.get(socket)!.add(room);

		this.logger.log(`Client subscribed to ${room}`);
	}

	unsubscribeFromRoom(socket: WebSocket, room: string): void {
		if (this.clients.has(room)) {
			this.clients.get(room)!.delete(socket);
			this.socketRooms.get(socket)?.delete(room);
			this.logger.log(`Client unsubscribed from ${room}`);
		}
	}

	getClientsInRoom(room: string): Set<WebSocket> | undefined {
		return this.clients.get(room);
	}

	cleanup(socket: WebSocket): void {
		const rooms = this.socketRooms.get(socket);
		if (rooms) {
			for (const room of rooms) {
				const clients = this.clients.get(room);
				if (clients) {
					clients.delete(socket);
					if (clients.size === 0) {
						this.clients.delete(room);
					}
				}
			}
			this.socketRooms.delete(socket);
		}
		this.logger.log('Socket cleanup completed');
	}
}

export { RoomManagerService };
