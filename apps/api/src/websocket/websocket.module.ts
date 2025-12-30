import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from '../auth/entitites/session.entity';
import { GenerationRequest } from '../generations/entities/generation-request.entity';
import { AppConfigModule } from '../config/config.module';
import { WebSocketGateway } from './websocket.gateway';
import { WebSocketEventHandler } from './websocket.event-handler';
import { SessionAuthService } from './services/session-auth.service';
import { RoomManagerService } from './services/room-manager.service';
import { BroadcastService } from './services/broadcast.service';
import { MessageHandlerService } from './services/message-handler.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([Session, GenerationRequest]),
		AppConfigModule
	],
	providers: [
		WebSocketGateway,
		WebSocketEventHandler,
		SessionAuthService,
		RoomManagerService,
		BroadcastService,
		MessageHandlerService
	],
	exports: [
		WebSocketGateway,
		SessionAuthService,
		RoomManagerService,
		BroadcastService
	]
})
class WebSocketModule {}

export { WebSocketModule };
