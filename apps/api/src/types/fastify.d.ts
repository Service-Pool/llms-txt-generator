import 'fastify';
import 'nestjs-cls';
import '@fastify/session';

// Type alias для SessionData = Fastify.Session
type SessionData = import('fastify').Session;

declare module 'fastify' {
	interface Session {
		userId?: number;
		sessionId: string;
		// Расширяем cookie, добавляя originalExpires (отсутствует в @fastify/session типах)
		cookie: {
			originalMaxAge: number | null;
			originalExpires?: Date | null; // Добавлено: реально используется библиотекой
			maxAge?: number;
			signed?: boolean;
			expires?: Date | null;
			httpOnly?: boolean;
			path?: string;
			domain?: string;
			secure?: boolean | 'auto';
			sameSite?: boolean | 'lax' | 'strict' | 'none';
		};
	}
}

declare module 'nestjs-cls' {
	interface ClsStore {
		sessionData?: SessionData;
		abortSignal?: AbortSignal;
	}
}
