import { AuthService } from './services/auth.service';
import { MessageSuccess } from '../../utils/response/message-success';
import { MessageError } from '../../utils/response/message-error';
import { Controller, Post, Get, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { CurrentUserService } from './services/current-user.service';
import { LoginDto } from './dto/login.dto';
import { ApiResponse } from '../../utils/response/api-response';
import { ResponseCode } from '../../enums/response-code.enum';
import { type FastifyRequest } from 'fastify';
import { AuthLoginDtoResponse, AuthLogoutDtoResponse, AuthStatusDtoResponse } from './dto/auth-response.dto';

@Controller('auth')
class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly currentUserService: CurrentUserService,
		private readonly apiResponse: ApiResponse
	) { }

	@Post('login')
	@HttpCode(HttpStatus.OK)
	async login(
		@Body() loginDto: LoginDto,
		@Req() request: FastifyRequest
	): Promise<ApiResponse<MessageSuccess<AuthLoginDtoResponse> | MessageError>> {
		const user = await this.authService.validateUser(loginDto.username, loginDto.password || null);

		if (!user) {
			return this.apiResponse.error(ResponseCode.ERROR, 'Invalid credentials');
		}

		// Migrate anonymous GenerationRequests from this session to user
		const migratedCount = await this.authService.migrateSessionToUser(request.session.sessionId, user.id);

		// Set session data
		request.session.userId = user.id;

		return this.apiResponse.success(AuthLoginDtoResponse.fromEntity(
			user,
			migratedCount
		));
	}

	@Post('logout')
	@HttpCode(HttpStatus.OK)
	async logout(@Req() request: FastifyRequest): Promise<ApiResponse<MessageSuccess<AuthLogoutDtoResponse> | MessageError>> {
		if (!request.session.userId) {
			return this.apiResponse.error(ResponseCode.ERROR, 'Not authenticated');
		}

		await new Promise<void>((resolve, reject) => {
			request.session.destroy((err) => {
				if (err) reject(err instanceof Error ? err : new Error(String(err)));
				else resolve();
			});
		});

		return this.apiResponse.success(AuthLogoutDtoResponse.fromEntity('Logged out successfully'));
	}

	@Get('me')
	async status(): Promise<ApiResponse<MessageSuccess<AuthStatusDtoResponse>>> {
		const userId = this.currentUserService.getUserId();
		const sessionId = this.currentUserService.getSessionId();

		if (userId) {
			const user = await this.authService.findById(userId);
			if (user) {
				return this.apiResponse.success(AuthStatusDtoResponse.fromEntity(
					true,
					sessionId,
					user
				));
			}
		}

		return this.apiResponse.success(AuthStatusDtoResponse.fromEntity(false));
	}
}

export { AuthController };
