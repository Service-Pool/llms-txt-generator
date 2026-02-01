import 'fastify';
import 'nestjs-cls';
import '@fastify/session';

interface SessionInterface {
	userId?: number;
	sessionId: string;
}

declare module 'fastify' {
	interface Session {
		userId?: number;
		sessionId: string;
	}
}

declare module 'nestjs-cls' {
	interface ClsStore {
		userId?: number | null;
		sessionId?: string;
		session?: SessionInterface;
		abortSignal?: AbortSignal;
	}
}
