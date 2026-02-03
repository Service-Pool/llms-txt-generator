import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/entities/order.entity';
import { Session } from './entities/session.entity';
import { UsersModule } from '../users/users.module';
import { OrdersModule } from '../orders/orders.module';
import { AuthService } from './services/auth.service';
import { MailService } from './services/mail.service';
import { SessionService } from './services/session.service';
import { AuthController } from './controllers/auth.controller';

@Module({
	imports: [
		TypeOrmModule.forFeature([Order, Session]),
		UsersModule,
		forwardRef(() => OrdersModule)
	],
	controllers: [AuthController],
	providers: [AuthService, MailService, SessionService],
	exports: [AuthService]
})

export class AuthModule { }
