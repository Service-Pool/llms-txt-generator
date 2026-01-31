import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/entities/order.entity';
import { Session } from './entities/session.entity';
import { UsersModule } from '../users/users.module';
import { AuthService } from './services/auth.service';
import { MailService } from './services/mail.service';
import { SessionService } from './services/session.service';
import { AuthController } from './controllers/auth.controller';

@Module({
	imports: [
		TypeOrmModule.forFeature([Order, Session]),
		UsersModule
	],
	controllers: [AuthController],
	providers: [AuthService, MailService, SessionService],
	exports: [AuthService, SessionService]
})

export class AuthModule { }
