import { AuthService } from './services/auth.service';
import { MessageSuccess } from '../../utils/response/message-success';
import { MessageError } from '../../utils/response/message-error';
import { Controller, Post, Get, Body, HttpCode, HttpStatus, Req, Query } from '@nestjs/common';
import { CurrentUserService } from './services/current-user.service';
import { RequestMagicLinkRequestDto } from './dto/auth-request.dto';
import { ApiResponse } from '../../utils/response/api-response';
import { ResponseCode } from '../../enums/response-code.enum';
import { type FastifyRequest } from 'fastify';
import { AuthLoginDtoResponse, AuthLogoutDtoResponse, AuthStatusDtoResponse, RequestMagicLinkResponseDto } from './dto/auth-response.dto';

@Controller('api/auth')
class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly currentUserService: CurrentUserService,
		private readonly apiResponse: ApiResponse
	) { }

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

	@Post('request-magic-link')
	@HttpCode(HttpStatus.OK)
	async requestMagicLink(@Body() dto: RequestMagicLinkRequestDto): Promise<ApiResponse<MessageSuccess<RequestMagicLinkResponseDto> | MessageError>> {
		await this.authService.requestMagicLink(dto.email);
		return this.apiResponse.success(RequestMagicLinkResponseDto.fromEntity('Magic link sent to your email'));
	}

	@Get('verify-magic-link')
	async verifyMagicLink(@Query('token') token: string, @Req() request: FastifyRequest): Promise<ApiResponse<MessageSuccess<AuthLoginDtoResponse> | MessageError>> {
		if (!token) {
			return this.apiResponse.error(ResponseCode.ERROR, 'Token is required');
		}

		const user = await this.authService.verifyMagicLink(token);

		if (!user) {
			return this.apiResponse.error(ResponseCode.ERROR, 'Invalid or expired token');
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
}

export { AuthController };
