import { ApiResponse } from '../../utils/response/api-response';
import { AuthLoginDtoResponse, AuthLogoutDtoResponse, AuthStatusDtoResponse, RequestLoginLinkResponseDto } from './dto/auth-response.dto';
import { AuthService } from './services/auth.service';
import { ClsService } from 'nestjs-cls';
import { Controller, Post, Get, Body, HttpCode, HttpStatus, Req, Query } from '@nestjs/common';
import { MessageError } from '../../utils/response/message-error';
import { MessageSuccess } from '../../utils/response/message-success';
import { RequestLoginLinkRequestDto } from './dto/auth-request.dto';
import { ResponseCode } from '../../enums/response-code.enum';
import { type FastifyRequest } from 'fastify';
import { type UserClsStore } from './models/user-context.model';
@Controller('api/auth')
class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly apiResponse: ApiResponse,
		private readonly cls: ClsService<UserClsStore>
	) { }

	@Post('logout')
	@HttpCode(HttpStatus.OK)
	async logout(@Req() request: FastifyRequest): Promise<ApiResponse<MessageSuccess<AuthLogoutDtoResponse> | MessageError>> {
		if (!this.cls.get('userId')) {
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
		const userId = this.cls.get('userId');
		const sessionId = this.cls.get('sessionId');

		if (userId) {
			const userEntity = await this.authService.findById(userId);
			if (userEntity) {
				return this.apiResponse.success(AuthStatusDtoResponse.fromEntity(
					true,
					sessionId,
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
		const migratedCount = await this.authService.migrateSessionToUser(this.cls.get('sessionId'), user.id);

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
