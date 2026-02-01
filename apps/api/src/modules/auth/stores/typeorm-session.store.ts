import { SessionStore } from '@fastify/session';
import { SessionService } from '../services/session.service';
import { SessionData } from '../entities/session.entity';

/**
 * TypeORM Session Store for @fastify/session
 * Implements SessionStore interface to persist sessions in MySQL database
 */
class TypeOrmSessionStore implements SessionStore {
	constructor(private readonly sessionService: SessionService) { }

	/**
	 * Set session data
	 */
	public set(sessionId: string, session: SessionData, callback?: (err?: unknown) => void): void {
		const maxAge = session.cookie?.maxAge || 86400000; // 24 hours in ms
		const expiresAt = new Date(Date.now() + maxAge);
		const userId = session.userId || null;

		this.sessionService.saveSession(sessionId, session, expiresAt, userId)
			.then(() => {
				if (callback) callback();
			})
			.catch((error) => {
				if (callback) callback(error);
			});
	}

	/**
	 * Get session data
	 */
	public get(sessionId: string, callback?: (err: unknown, result?: SessionData) => void): void {
		this.sessionService.getSession(sessionId)
			.then(async (sessionEntity) => {
				if (!sessionEntity) {
					if (callback) callback(null, null);
					return;
				}
				if (sessionEntity.expiresAt < new Date()) {
					await this.sessionService.destroySession(sessionId);
					if (callback) callback(null, null);
					return;
				}
				const sessionData = sessionEntity.data;
				if (callback) callback(null, sessionData);
			})
			.catch((error) => {
				if (callback) callback(error);
			});
	}

	/**
	 * Destroy session
	 */
	public destroy(sessionId: string, callback?: (err?: unknown) => void): void {
		this.sessionService.destroySession(sessionId)
			.then(() => {
				if (callback) callback();
			})
			.catch((error) => {
				if (callback) callback(error);
			});
	}
}

export { TypeOrmSessionStore };
