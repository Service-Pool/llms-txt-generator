import { Repository } from 'typeorm';
import { Session } from './entitites/session.entity';
import { type Session as FastifySession } from 'fastify';

type Callback = (err?: Error | null) => void;
type CallbackSession = (err: Error | null, result?: FastifySession | null) => void;

export class TypeORMSessionStore {
	constructor(
		private readonly sessionRepository: Repository<Session>,
		private readonly defaultMaxAge: number
	) {}

	get(sid: string, callback: CallbackSession): void {
		console.log('[SessionStore] get() called for sid:', sid);

		this.sessionRepository.findOne({ where: { sid } })
			.then((session) => {
				console.log('[SessionStore] get() session found:', !!session);

				if (!session) {
					callback(null, null);
					return;
				}

				// Check if expired
				if (session.expire < new Date()) {
					console.log('[SessionStore] get() session expired');
					this.destroy(sid, () => {
						callback(null, null);
					});
					return;
				}

				console.log('[SessionStore] get() returning session data');
				callback(null, session.sess);
			})
			.catch((error: unknown) => {
				console.error('[SessionStore] get() error:', error);
				callback(error instanceof Error ? error : new Error(String(error)));
			});
	}

	set(sid: string, sessionData: FastifySession, callback: Callback): void {
		console.log('[SessionStore] set() called for sid:', sid);

		const maxAge = sessionData.cookie?.maxAge || this.defaultMaxAge;
		const expire = new Date(Date.now() + maxAge);

		console.log('[SessionStore] set() saving session');
		this.sessionRepository.save({
			sid,
			sess: sessionData,
			expire
		})
			.then(() => {
				console.log('[SessionStore] set() session saved');
				callback();
			})
			.catch((error: unknown) => {
				console.error('[SessionStore] set() error:', error);
				callback(error instanceof Error ? error : new Error(String(error)));
			});
	}

	destroy(sid: string, callback: Callback): void {
		console.log('[SessionStore] destroy() called for sid:', sid);

		this.sessionRepository.delete({ sid })
			.then(() => {
				console.log('[SessionStore] destroy() completed');
				callback();
			})
			.catch((error: unknown) => {
				console.error('[SessionStore] destroy() error:', error);
				callback(error instanceof Error ? error : new Error(String(error)));
			});
	}

	// Cleanup expired sessions
	async cleanup(): Promise<void> {
		await this.sessionRepository
			.createQueryBuilder()
			.delete()
			.where('expire < :now', { now: new Date() })
			.execute();
	}
}
