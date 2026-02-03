import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { SessionData } from '../entities/session.entity';

/**
 * SessionGuard - проверяет наличие авторизации
 * Требует наличия userId в session
 */
@Injectable()
class SessionGuard implements CanActivate {
	constructor(private readonly clsService: ClsService) { }

	public canActivate(_context: ExecutionContext): boolean {
		const session = this.clsService.get<SessionData>('sessionData');

		if (!session?.userId) {
			throw new UnauthorizedException('Authentication required');
		}

		return true;
	}
}

export { SessionGuard };
