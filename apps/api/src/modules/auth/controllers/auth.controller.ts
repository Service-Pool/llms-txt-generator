import { ApiResponse } from '../../../utils/response/api-response';
import { AuthService } from '../services/auth.service';
import { Controller, Post, Get, Body, Query, Session, HttpCode, Logger } from '@nestjs/common';
import { MessageSuccess } from '../../../utils/response/message-success';
import { RequestLoginLinkRequestDto, LoginRequestDto } from '../dto/auth-request.dto';
import { VerifyLoginLinkResponseDto, StatusResponseDto } from '../dto/auth-response.dto';
import { type Session as SessionType } from 'fastify';

@Controller('api/auth')
class AuthController {
	private readonly logger = new Logger(AuthController.name);

	constructor(private readonly authService: AuthService) { }

	/**
	 * POST /api/auth/request-login-link
	 * Отправить Magic Link на email
	 */
	@Post('request-login-link')
	@HttpCode(200)
	public async requestLoginLink(@Body() dto: RequestLoginLinkRequestDto): Promise<ApiResponse<MessageSuccess>> {
		await this.authService.requestLoginLink(dto.email, dto.redirectUrl);

		return ApiResponse.success(`Login link been sent to ${dto.email}. Please check the email.`);
	}

	/**
	 * GET /api/auth/login?crd=...
	 * Проверить Magic Link и авторизовать пользователя
	 */
	@Get('login')
	public async login(@Query() query: LoginRequestDto, @Session() session: SessionType): Promise<ApiResponse<MessageSuccess<VerifyLoginLinkResponseDto>>> {
		// Вся логика проверки в authService.login
		const { user, redirectUrl } = await this.authService.login(query.crd, session);

		const response = new VerifyLoginLinkResponseDto(
			user.id,
			user.email,
			user.createdAt,
			redirectUrl
		);

		return ApiResponse.success(response);
	}

	/**
	 * POST /api/auth/logout
	 * Выйти из системы
	 */
	@Post('logout')
	@HttpCode(200)
	public logout(@Session() session: SessionType): ApiResponse<MessageSuccess> {
		this.authService.logout(session);

		return ApiResponse.success('Successfully logged out');
	}

	/**
	 * GET /api/auth/me
	 * Получить текущего пользователя
	 */
	@Get('me')
	public async getCurrentUser(): Promise<ApiResponse<MessageSuccess<StatusResponseDto | null>>> {
		const user = await this.authService.status();

		if (!user) {
			return ApiResponse.success(null);
		}

		const response = new StatusResponseDto(
			user.id,
			user.email,
			user.createdAt
		);

		return ApiResponse.success(response);
	}
}

export { AuthController };
