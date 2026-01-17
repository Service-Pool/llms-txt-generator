import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Session } from '../entitites/session.entity';

@Injectable()
export class SessionCleanupService {
	private readonly logger = new Logger(SessionCleanupService.name);

	constructor(@InjectRepository(Session)
	private readonly sessionRepository: Repository<Session>) { }

	@Cron(CronExpression.EVERY_HOUR)
	async cleanupExpiredSessions(): Promise<void> {
		this.logger.log('Starting expired sessions cleanup');

		const result = await this.sessionRepository.delete({
			expire: LessThan(new Date())
		});

		this.logger.log(`Cleanup complete. Deleted ${result.affected ?? 0} expired sessions`);
	}
}
