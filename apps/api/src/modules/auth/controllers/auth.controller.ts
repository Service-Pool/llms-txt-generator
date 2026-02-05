import { ApiResponse } from '../../../utils/response/api-response';
import { AuthService } from '../services/auth.service';
import { Controller, Post, Get, Body, Query, Session, HttpCode, Logger } from '@nestjs/common';
import { RequestLoginLinkRequestDto, LoginRequestDto } from '../dto/auth-request.dto';
import {
	RequestLoginLinkResponseDto,
	AuthLoginDtoResponse,
	AuthLogoutDtoResponse,
	AuthStatusDtoResponse
} from '../dto/auth-response.dto';
import { type Session as SessionType } from 'fastify';

@Controller('api/auth')
class AuthController {
	private readonly logger = new Logger(AuthController.name);

	constructor(private readonly authService: AuthService) { }

	/**
	 * POST /api/auth/request-login-link
	 * Отправить Magic Link на email
	 */
	@Post('login-link-request')
	@HttpCode(200)
	public async requestLoginLink(@Body() dto: RequestLoginLinkRequestDto): Promise<ApiResponse<RequestLoginLinkResponseDto>> {
		await this.authService.requestLoginLink(dto.email, dto.redirectUrl);

		return ApiResponse.success(RequestLoginLinkResponseDto.create(`Login link has been sent to ${dto.email}. Please check your email.`));
	}

	/**
	 * GET /api/auth/login?crd=...
	 * Проверить Magic Link и авторизовать пользователя
	 */
	@Get('login')
	public async login(@Query() query: LoginRequestDto, @Session() session: SessionType): Promise<ApiResponse<AuthLoginDtoResponse>> {
		// Вся логика проверки в authService.login
		const { user, redirectUrl } = await this.authService.login(query.crd, session);

		return ApiResponse.success(AuthLoginDtoResponse.fromEntity(user, redirectUrl, 0));
	}

	/**
	 * POST /api/auth/logout
	 * Выйти из системы
	 */
	@Post('logout')
	@HttpCode(200)
	public logout(@Session() session: SessionType): ApiResponse<AuthLogoutDtoResponse> {
		this.authService.logout(session);

		return ApiResponse.success(AuthLogoutDtoResponse.create('Successfully logged out'));
	}

	/**
	 * GET /api/auth/me
	 * Получить текущего пользователя
	 */
	@Get('me')
	public async getCurrentUser(): Promise<ApiResponse<AuthStatusDtoResponse>> {
		const { user, sessionId } = await this.authService.status();

		return ApiResponse.success(AuthStatusDtoResponse.fromEntity(!!user, sessionId, user));
	}
}

export { AuthController };
