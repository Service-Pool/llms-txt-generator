import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '@/modules/orders/entities/order.entity';
import { Session } from '@/modules/auth/entities/session.entity';
import { UsersModule } from '@/modules/users/users.module';
import { OrdersModule } from '@/modules/orders/orders.module';
import { AuthService } from '@/modules/auth/services/auth.service';
import { MailService } from '@/modules/auth/services/mail.service';
import { SessionService } from '@/modules/auth/services/session.service';
import { AuthController } from '@/modules/auth/controllers/auth.controller';

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
