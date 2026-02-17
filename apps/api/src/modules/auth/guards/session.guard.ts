import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { type FastifyRequest } from 'fastify';
import { SessionData } from '../entities/session.entity';

/**
 * SessionGuard - проверяет наличие авторизации
 * Требует наличия userId в session
 */
@Injectable()
class SessionGuard implements CanActivate {
	private readonly _logger = new Logger(SessionGuard.name);

	public canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest<FastifyRequest>();
		const session = request.session as SessionData;

		if (!session?.userId) {
			throw new UnauthorizedException('Authentication required');
		}

		return true;
	}
}

export { SessionGuard };
