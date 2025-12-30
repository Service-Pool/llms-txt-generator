import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { type FastifyRequest } from 'fastify';
import { Session } from '../../auth/entitites/session.entity';
import { GenerationRequest } from '../../generations/entities/generation-request.entity';
import { AppConfigService } from '../../config/config.service';

class SessionData {
	constructor(
		public readonly userId: number | null,
		public readonly sessionId: string
	) {}
}

@Injectable()
class SessionAuthService {
	private readonly logger = new Logger(SessionAuthService.name);

	constructor(
		@InjectRepository(Session) private readonly sessionRepository: Repository<Session>,
		@InjectRepository(GenerationRequest) private readonly generationRequestRepository: Repository<GenerationRequest>,
		private readonly configService: AppConfigService
	) {}

	async extractSession(req: FastifyRequest): Promise<SessionData | null> {
		const cookies = req.headers.cookie;
		if (!cookies) {
			this.logger.warn('No cookie header');
			return null;
		}

		const sessionId = this.parseCookie(cookies, this.configService.session.cookieName);
		if (!sessionId) {
			this.logger.warn(`No session cookie found (looking for ${this.configService.session.cookieName})`);
			return null;
		}

		this.logger.log(`Parsed session ID: ${sessionId}`);

		const session = await this.sessionRepository.findOne({ where: { sid: sessionId } });
		if (!session) {
			this.logger.warn(`Session not found in DB: ${sessionId}`);
			return null;
		}

		const userId = session.sess.userId || null;
		this.logger.log(`Session found: userId=${userId}`);
		return new SessionData(userId, sessionId);
	}

	async checkGenerationAccess(generationId: number, userId: number | null, sessionId: string): Promise<boolean> {
		const whereCondition = userId
			? { generationId, userId }
			: { generationId, sessionId };

		const request = await this.generationRequestRepository.findOne({ where: whereCondition });
		return request !== null;
	}

	private parseCookie(cookieString: string, cookieName: string): string | null {
		const cookies = cookieString.split(';').map(c => c.trim());
		for (const cookie of cookies) {
			const [name, value] = cookie.split('=');
			if (name === cookieName) {
				let decodedValue = decodeURIComponent(value);

				// Handle signed cookie format: s:value.signature or value.signature
				if (decodedValue.startsWith('s:')) {
					decodedValue = decodedValue.substring(2);
				}

				// Extract session ID (part before signature)
				const dotIndex = decodedValue.indexOf('.');
				if (dotIndex !== -1) {
					decodedValue = decodedValue.substring(0, dotIndex);
				}

				return decodedValue;
			}
		}
		return null;
	}
}

export { SessionAuthService, SessionData };
