import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from '../auth/entitites/session.entity';
import { GenerationRequest } from '../generations/entities/generation-request.entity';
import { AppConfigModule } from '../config/config.module';
import { WebSocketGateway } from './websocket.gateway';

@Module({
	imports: [
		TypeOrmModule.forFeature([Session, GenerationRequest]),
		AppConfigModule
	],
	providers: [WebSocketGateway],
	exports: [WebSocketGateway]
})
class WebSocketModule {}

export { WebSocketModule };
