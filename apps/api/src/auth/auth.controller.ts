import { Controller, Post, Get, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { type FastifyRequest } from 'fastify';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { ResponseFactory } from '../common/utils/response.factory';
import { CurrentUserService } from '../common/services/current-user.service';

@Controller('auth')
class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly currentUserService: CurrentUserService
	) {}

	@Post('login')
	@HttpCode(HttpStatus.OK)
	async login(@Body() loginDto: LoginDto, @Req() request: FastifyRequest) {
		const user = await this.authService.validateUser(loginDto.username, loginDto.password || null);

		if (!user) {
			return ResponseFactory.unauthorized('Invalid credentials');
		}

		// Migrate anonymous GenerationRequests from this session to user
		const migratedCount = await this.authService.migrateSessionToUser(request.session.sessionId, user.id);

		// Set session data
		request.session.userId = user.id;

		return ResponseFactory.success({
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
			return ResponseFactory.unauthorized('Not authenticated');
		}

		await new Promise<void>((resolve, reject) => {
			request.session.destroy((err) => {
				if (err) reject(err instanceof Error ? err : new Error(String(err)));
				else resolve();
			});
		});

		return ResponseFactory.success({ message: 'Logged out successfully' });
	}

	@Get('me')
	async status() {
		const userId = this.currentUserService.getUserId();
		const sessionId = this.currentUserService.getSessionId();

		if (userId) {
			const user = await this.authService.findById(userId);
			if (user) {
				return ResponseFactory.success({
					authenticated: true,
					sessionId: sessionId,
					user: {
						id: user.id,
						username: user.username,
						email: user.email
					}
				});
			}
		}

		return ResponseFactory.success({ authenticated: false });
	}
}

export { AuthController };
