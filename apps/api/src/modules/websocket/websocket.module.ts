import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebSocketService } from '@/modules/websocket/services/websocket.service';
import { WebSocketGateway } from '@/modules/websocket/gateways/websocket.gateway';
import { StatsModule } from '@/modules/stats/stats.module';
import { OrdersModule } from '@/modules/orders/orders.module';
import { AiModelsModule } from '@/modules/ai-models/ai-models.module';
import { QueueModule } from '@/modules/queue/queue.module';
import { QueueEventsService } from '@/modules/queue/services/queue-events.service';
import { Session } from '@/modules/auth/entities/session.entity';
import { Order } from '@/modules/orders/entities/order.entity';

@Module({
	imports: [
		TypeOrmModule.forFeature([Session, Order]),
		StatsModule,
		AiModelsModule,
		QueueModule,
		forwardRef(() => OrdersModule)
	],
	providers: [WebSocketService, WebSocketGateway, QueueEventsService],
	exports: [WebSocketService]
})

export class WebSocketModule { }
