import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebSocketService } from './services/websocket.service';
import { WebSocketGateway } from './gateways/websocket.gateway';
import { StatsModule } from '../stats/stats.module';
import { OrdersModule } from '../orders/orders.module';
import { Session } from '../auth/entities/session.entity';
import { Order } from '../orders/entities/order.entity';

@Module({
	imports: [
		TypeOrmModule.forFeature([Session, Order]),
		StatsModule,
		forwardRef(() => OrdersModule)
	],
	providers: [WebSocketService, WebSocketGateway],
	exports: [WebSocketService]
})

export class WebSocketModule { }
