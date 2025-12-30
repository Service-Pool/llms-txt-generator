import { Injectable, Logger } from '@nestjs/common';
import { RoomManagerService } from './room-manager.service';

@Injectable()
class BroadcastService {
	private readonly logger = new Logger(BroadcastService.name);

	constructor(private readonly roomManager: RoomManagerService) {}

	broadcastToRoom(room: string, message: unknown): void {
		const clients = this.roomManager.getClientsInRoom(room);
		if (clients && clients.size > 0) {
			const messageStr = JSON.stringify(message);
			for (const socket of clients) {
				try {
					socket.send(messageStr);
				} catch (error) {
					this.logger.error(`Error broadcasting to client:`, error);
				}
			}
			this.logger.log(`Broadcast to ${room}: ${clients.size} clients`);
		}
	}
}

export { BroadcastService };
