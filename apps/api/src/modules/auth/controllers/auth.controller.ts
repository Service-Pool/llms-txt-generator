import { ApiResponse } from '@/utils/response/api-response';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBody } from '@nestjs/swagger';
import { AppConfigService } from '@/config/config.service';
import { AuthService } from '@/modules/auth/services/auth.service';
import { Controller, Post, Get, Body, Query, Session, HttpCode, Logger } from '@nestjs/common';
import { HttpStatus } from '@/enums/response-code.enum';
import { RequestLoginLinkRequestDto, LoginRequestDto } from '@/modules/auth/dto/auth-request.dto';
import {
	RequestLoginLinkResponseDto,
	AuthLoginDtoResponse,
	AuthLogoutDtoResponse,
	AuthStatusDtoResponse
} from '@/modules/auth/dto/auth-response.dto';
import { type Session as SessionType } from 'fastify';

@ApiTags('Authentication')
@Controller('api/auth')
class AuthController {
	private readonly logger = new Logger(AuthController.name);

	constructor(
		private readonly authService: AuthService,
		private readonly configService: AppConfigService
	) { }

	/**
	 * POST /api/auth/request-login-link
	 * Отправить Magic Link на email
	 */
	@ApiOperation({ summary: 'Request login link', description: 'Send magic login link to email' })
	@ApiBody({ type: RequestLoginLinkRequestDto })
	@SwaggerResponse({
		status: HttpStatus.OK,
		description: 'Login link sent successfully',
		schema: ApiResponse.getSuccessSchema(RequestLoginLinkResponseDto)
	})
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
	@ApiOperation({ summary: 'Login', description: 'Verify magic link and authenticate user' })
	@SwaggerResponse({
		status: HttpStatus.OK,
		description: 'User authenticated successfully',
		schema: ApiResponse.getSuccessSchema(AuthLoginDtoResponse)
	})
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
	@ApiOperation({ summary: 'Logout', description: 'Logout current user' })
	@SwaggerResponse({
		status: HttpStatus.OK,
		description: 'User logged out successfully',
		schema: ApiResponse.getSuccessSchema(AuthLogoutDtoResponse)
	})
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
	@ApiOperation({ summary: 'Get current user', description: 'Get current authenticated user status' })
	@SwaggerResponse({
		status: HttpStatus.OK,
		description: 'Current user status',
		schema: ApiResponse.getSuccessSchema(AuthStatusDtoResponse)
	})
	@Get('me')
	public async getCurrentUser(): Promise<ApiResponse<AuthStatusDtoResponse>> {
		const { user, sessionId } = await this.authService.status();

		return ApiResponse.success(AuthStatusDtoResponse.fromEntity(!!user, sessionId, user));
	}
}

export { AuthController };
