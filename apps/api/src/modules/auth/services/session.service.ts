import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Session, SessionData } from '../entities/session.entity';

@Injectable()
class SessionService {
	private readonly logger = new Logger(SessionService.name);

	constructor(@InjectRepository(Session)
	private readonly sessionRepository: Repository<Session>) { }

	/**
	 * Get session by sessionId
	 */
	public async getSession(sessionId: string): Promise<Session | null> {
		return this.sessionRepository.findOne({
			where: { sessionId }
		});
	}

	/**
	 * Save or update session
	 */
	public async saveSession(sessionId: string, data: SessionData, expiresAt: Date, userId?: number): Promise<Session> {
		const existingSession = await this.sessionRepository.findOne({
			where: { sessionId }
		});

		if (existingSession) {
			existingSession.data = data;
			existingSession.expiresAt = expiresAt;
			existingSession.updatedAt = new Date();
			if (userId !== undefined) {
				existingSession.userId = userId;
			}
			return this.sessionRepository.save(existingSession);
		}

		const newSession = this.sessionRepository.create({
			sessionId,
			data,
			expiresAt,
			userId,
			updatedAt: new Date()
		});

		return this.sessionRepository.save(newSession);
	}

	/**
	 * Destroy session by sessionId
	 */
	public async destroySession(sessionId: string): Promise<void> {
		await this.sessionRepository.delete({ sessionId });
	}

	/**
	 * Clean up expired sessions
	 */
	public async cleanupExpiredSessions(): Promise<number> {
		const result = await this.sessionRepository.delete({
			expiresAt: LessThan(new Date())
		});

		const deletedCount = result.affected || 0;
		if (deletedCount > 0) {
			this.logger.log(`Cleaned up ${deletedCount} expired sessions`);
		}

		return deletedCount;
	}

	/**
	 * Get all sessions for a user
	 */
	public async getUserSessions(userId: number): Promise<Session[]> {
		return this.sessionRepository.find({
			where: { userId },
			order: { createdAt: 'DESC' }
		});
	}

	/**
	 * Destroy all sessions for a user
	 */
	public async destroyUserSessions(userId: number): Promise<void> {
		await this.sessionRepository.delete({ userId });
	}
}

export { SessionService };
