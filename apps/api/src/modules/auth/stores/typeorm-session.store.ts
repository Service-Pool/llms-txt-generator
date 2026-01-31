import { SessionStore } from '@fastify/session';
import { SessionService } from '../services/session.service';

/**
 * TypeORM Session Store for @fastify/session
 * Implements SessionStore interface to persist sessions in MySQL database
 */
class TypeOrmSessionStore implements SessionStore {
	constructor(private readonly sessionService: SessionService) { }

	/**
	 * Set session data
	 */
	async set(sessionId: string, session: any, callback?: (err?: any) => void): void {
		try {
			// Calculate expiration based on cookie.maxAge or default 24 hours
			const maxAge = session.cookie?.maxAge || 86400000; // 24 hours in ms
			const expiresAt = new Date(Date.now() + maxAge);

			// Extract userId from session data if present
			const userId = session.userId || null;

			// Save session
			await this.sessionService.saveSession(
				sessionId,
				session,
				expiresAt,
				userId
			);

			if (callback) {
				callback();
			}
		} catch (error) {
			if (callback) {
				callback(error);
			} else {
				throw error;
			}
		}
	}

	/**
	 * Get session data
	 */
	async get(sessionId: string, callback?: (err: any, result?: any) => void): Promise<any> {
		try {
			const sessionEntity = await this.sessionService.getSession(sessionId);

			if (!sessionEntity) {
				if (callback) {
					callback(null, null);
				}
				return null;
			}

			// Check if session is expired
			if (sessionEntity.expiresAt < new Date()) {
				// Clean up expired session
				await this.sessionService.destroySession(sessionId);
				if (callback) {
					callback(null, null);
				}
				return null;
			}

			// Parse session data
			const sessionData = JSON.parse(sessionEntity.data);

			if (callback) {
				callback(null, sessionData);
			}
			return sessionData;
		} catch (error) {
			if (callback) {
				callback(error);
			} else {
				throw error;
			}
			return null;
		}
	}

	/**
	 * Destroy session
	 */
	async destroy(sessionId: string, callback?: (err?: any) => void): Promise<void> {
		try {
			await this.sessionService.destroySession(sessionId);

			if (callback) {
				callback();
			}
		} catch (error) {
			if (callback) {
				callback(error);
			} else {
				throw error;
			}
		}
	}
}

export { TypeOrmSessionStore };
