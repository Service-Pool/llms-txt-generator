import { AppConfigModule } from '../../config/config.module';
import { GenerationRequest } from '../generations/entities/generation-request.entity';
import { Module } from '@nestjs/common';
import { Session } from '../auth/entitites/session.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
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
