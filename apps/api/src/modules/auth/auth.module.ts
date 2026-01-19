import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { GenerationRequest } from '../generations/entities/generation-request.entity';
import { MailService } from './services/mail.service';
import { Module } from '@nestjs/common';
import { ApiResponse } from '../../utils/response/api-response';
import { Session } from './entitites/session.entity';
import { SessionCleanupService } from './services/session-cleanup.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entitites/user.entity';

@Module({
	imports: [TypeOrmModule.forFeature([
		Session,
		User,
		GenerationRequest
	])],
	controllers: [AuthController],
	providers: [
		AuthService,
		MailService,
		SessionCleanupService,
		ApiResponse
	],
	exports: [AuthService]
})
export class AuthModule { }
