import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppWebSocketGateway } from './websocket.gateway';
import { Session } from '../auth/entitites/session.entity';
import { GenerationRequest } from '../generations/entities/generation-request.entity';
import { AppConfigModule } from '../config/config.module';

@Module({
	imports: [
		TypeOrmModule.forFeature([Session, GenerationRequest]),
		AppConfigModule
	],
	providers: [AppWebSocketGateway],
	exports: [AppWebSocketGateway]
})
class WebSocketModule {}

export { WebSocketModule };
