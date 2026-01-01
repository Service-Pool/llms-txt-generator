import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { type FastifyRequest } from 'fastify';

@Injectable({ scope: Scope.REQUEST })
export class CurrentUserService {
	constructor(@Inject(REQUEST) private request: FastifyRequest) {}

	getUserId(): number | null {
		return this.request.session?.userId || null;
	}

	getSessionId(): string {
		return this.request.session.sessionId;
	}

	hasUserOrSession(): boolean {
		return !!this.getUserId() || !!this.getSessionId();
	}
}
