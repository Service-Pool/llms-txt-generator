import { Controller, Post, Get, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { type FastifyRequest } from 'fastify';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { Session } from '../common/decorators/session.decorator';
import { ApiResponseDto } from '../common/dto/api-response';

type FastifySessionType = FastifyRequest['session'];

@Controller('auth')
class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('login')
	@HttpCode(HttpStatus.OK)
	async login(@Body() loginDto: LoginDto, @Req() request: FastifyRequest) {
		const user = await this.authService.validateUser(loginDto.username, loginDto.password || null);

		if (!user) {
			return ApiResponseDto.unauthorized('Invalid credentials');
		}

		// Migrate anonymous GenerationRequests from this session to user
		const migratedCount = await this.authService.migrateSessionToUser(request.session.sessionId, user.id);

		// Set session data
		request.session.userId = user.id;

		return ApiResponseDto.success({
			user: {
				id: user.id,
				email: user.email
			},
			migratedRequests: migratedCount
		});
	}

	@Post('logout')
	@HttpCode(HttpStatus.OK)
	async logout(@Req() request: FastifyRequest) {
		if (!request.session.userId) {
			return ApiResponseDto.unauthorized('Not authenticated');
		}

		await new Promise<void>((resolve, reject) => {
			request.session.destroy((err) => {
				if (err) reject(err instanceof Error ? err : new Error(String(err)));
				else resolve();
			});
		});

		return ApiResponseDto.success({ message: 'Logged out successfully' });
	}

	@Get('me')
	async status(@Session() session: FastifySessionType) {
		if (session.userId) {
			const user = await this.authService.findById(session.userId);
			if (user) {
				return ApiResponseDto.success({
					authenticated: true,
					sessionId: session.sessionId,
					user: {
						id: user.id,
						username: user.username,
						email: user.email
					}
				});
			}
		}

		return ApiResponseDto.success({ authenticated: false });
	}
}

export { AuthController };
