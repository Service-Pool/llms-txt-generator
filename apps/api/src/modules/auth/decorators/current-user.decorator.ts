import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { UserContext } from '../models/user-context.model';

const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext): UserContext => {
	const request = ctx.switchToHttp().getRequest<FastifyRequest>();
	return {
		userId: request.session?.userId || null,
		sessionId: request.session.sessionId
	};
});

export { CurrentUser };
