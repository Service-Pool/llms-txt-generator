import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

/**
 * SessionGuard - проверяет наличие авторизации
 * Требует наличия userId в CLS store
 */
@Injectable()
class SessionGuard implements CanActivate {
	constructor(private readonly clsService: ClsService) { }

	canActivate(_context: ExecutionContext): boolean {
		const userId = this.clsService.get<number | null>('userId');

		if (!userId) {
			throw new UnauthorizedException('Authentication required');
		}

		return true;
	}
}

export { SessionGuard };
