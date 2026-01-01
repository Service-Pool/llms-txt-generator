import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Session } from './entitites/session.entity';
import { type Session as FastifySession } from 'fastify';

type Callback = (err?: Error | null) => void;
type CallbackSession = (err: Error | null, result?: FastifySession | null) => void;

export class TypeORMSessionStore {
	private readonly logger = new Logger(TypeORMSessionStore.name);

	constructor(
		private readonly sessionRepository: Repository<Session>,
		private readonly defaultMaxAge: number
	) {}

	get(sid: string, callback: CallbackSession): void {
		this.logger.log(`[get] Called for sid: ${sid}`);

		this.sessionRepository.findOne({ where: { sid } })
			.then((session) => {
				this.logger.log(`[get] Session found: ${!!session}`);

				if (!session) {
					callback(null, null);
					return;
				}

				// Check if expired
				if (session.expire < new Date()) {
					this.logger.log('[get] Session expired');
					this.destroy(sid, () => {
						callback(null, null);
					});
					return;
				}

				this.logger.log('[get] Returning session data');
				callback(null, session.sess);
			})
			.catch((error: unknown) => {
				this.logger.error('[get] Error:', error);
				callback(error instanceof Error ? error : new Error(String(error)));
			});
	}

	set(sid: string, sessionData: FastifySession, callback: Callback): void {
		this.logger.log(`[set] Called for sid: ${sid}`);

		const maxAge = sessionData.cookie?.maxAge || this.defaultMaxAge;
		const expire = new Date(Date.now() + maxAge);

		this.logger.log('[set] Saving session');
		this.sessionRepository.save({
			sid,
			sess: sessionData,
			expire
		})
			.then(() => {
				this.logger.log('[set] Session saved');
				callback();
			})
			.catch((error: unknown) => {
				this.logger.error('[set] Error:', error);
				callback(error instanceof Error ? error : new Error(String(error)));
			});
	}

	destroy(sid: string, callback: Callback): void {
		this.logger.log(`[destroy] Called for sid: ${sid}`);

		this.sessionRepository.delete({ sid })
			.then(() => {
				this.logger.log('[destroy] Completed');
				callback();
			})
			.catch((error: unknown) => {
				this.logger.error('[destroy] Error:', error);
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
