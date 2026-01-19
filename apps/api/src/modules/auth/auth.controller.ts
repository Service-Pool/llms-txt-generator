import { AuthService } from './services/auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { MessageSuccess } from '../../utils/response/message-success';
import { MessageError } from '../../utils/response/message-error';
import { Controller, Post, Get, Body, HttpCode, HttpStatus, Req, Query } from '@nestjs/common';
import { RequestLoginLinkRequestDto } from './dto/auth-request.dto';
import { ApiResponse } from '../../utils/response/api-response';
import { ResponseCode } from '../../enums/response-code.enum';
import { type FastifyRequest } from 'fastify';
import { type UserContext } from './models/user-context.model';
import { AuthLoginDtoResponse, AuthLogoutDtoResponse, AuthStatusDtoResponse, RequestLoginLinkResponseDto } from './dto/auth-response.dto';

@Controller('api/auth')
class AuthController {
	constructor(
		private readonly authService: AuthService,
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
	async status(@CurrentUser() user: UserContext): Promise<ApiResponse<MessageSuccess<AuthStatusDtoResponse>>> {
		if (user.userId) {
			const userEntity = await this.authService.findById(user.userId);
			if (userEntity) {
				return this.apiResponse.success(AuthStatusDtoResponse.fromEntity(
					true,
					user.sessionId,
					userEntity
				));
			}
		}

		return this.apiResponse.success(AuthStatusDtoResponse.fromEntity(false));
	}

	@Post('request-login-link')
	@HttpCode(HttpStatus.OK)
	async requestLoginLink(@Body() dto: RequestLoginLinkRequestDto): Promise<ApiResponse<MessageSuccess<RequestLoginLinkResponseDto> | MessageError>> {
		await this.authService.requestLoginLink(dto.email, dto.redirectUrl);
		return this.apiResponse.success(RequestLoginLinkResponseDto.fromEntity('Login link sent to your email'));
	}

	@Get('verify-login-link')
	async verifyLoginLink(@Query('crd') crd: string, @Req() request: FastifyRequest): Promise<ApiResponse<MessageSuccess<AuthLoginDtoResponse> | MessageError>> {
		if (!crd) {
			return this.apiResponse.error(ResponseCode.ERROR, 'Credentials is required');
		}

		const crdString = this.authService.decryptAES(crd);
		const params = JSON.parse(crdString) as { token: string; redirectUrl: string };
		const token = params.token;
		const redirectUrl = params.redirectUrl || null;
		const user = await this.authService.verifyLoginLink(token);

		if (!user) {
			return this.apiResponse.error(ResponseCode.ERROR, 'Invalid or expired token');
		}

		// Migrate anonymous GenerationRequests from this session to user
		const migratedCount = await this.authService.migrateSessionToUser(request.session.sessionId, user.id);

		// Set session data
		request.session.userId = user.id;

		return this.apiResponse.success(AuthLoginDtoResponse.fromEntity(
			user,
			redirectUrl,
			migratedCount
		));
	}
}

export { AuthController };
