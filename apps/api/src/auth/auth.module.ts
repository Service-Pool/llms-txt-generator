import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from './entitites/session.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from './entitites/user.entity';
import { GenerationRequest } from '../generations/entities/generation-request.entity';

@Module({
	imports: [TypeOrmModule.forFeature([Session, User, GenerationRequest])],
	controllers: [AuthController],
	providers: [AuthService],
	exports: [AuthService]
})
export class AuthModule {}
