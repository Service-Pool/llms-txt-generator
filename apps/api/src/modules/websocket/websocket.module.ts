import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebSocketService } from './services/websocket.service';
import { WebSocketGateway } from './gateways/websocket.gateway';
import { StatsModule } from '../stats/stats.module';
import { OrdersModule } from '../orders/orders.module';
import { AiModelsModule } from '../ai-models/ai-models.module';
import { QueueEventsService } from '../queue/services/queue-events.service';
import { Session } from '../auth/entities/session.entity';
import { Order } from '../orders/entities/order.entity';

@Module({
	imports: [
		TypeOrmModule.forFeature([Session, Order]),
		StatsModule,
		AiModelsModule,
		forwardRef(() => OrdersModule)
	],
	providers: [WebSocketService, WebSocketGateway, QueueEventsService],
	exports: [WebSocketService]
})

export class WebSocketModule { }
