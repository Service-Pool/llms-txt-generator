import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { CurrentUserService } from './services/current-user.service';
import { GenerationRequest } from '../generations/entities/generation-request.entity';
import { Module } from '@nestjs/common';
import { ApiResponse } from '../../utils/response/api-response';
import { Session } from './entitites/session.entity';
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
		CurrentUserService,
		ApiResponse
	],
	exports: [AuthService]
})
export class AuthModule { }
