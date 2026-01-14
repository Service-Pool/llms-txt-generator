import { AppConfigService } from '../../../config/config.service';
import { GenerationRequest } from '../../generations/entities/generation-request.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MailService } from './mail.service';
import { MoreThan, Repository, IsNull } from 'typeorm';
import { User } from '../entitites/user.entity';
import * as crypto from 'crypto';

@Injectable()
class AuthService {
	constructor(
		@InjectRepository(User) private readonly userRepository: Repository<User>,
		@InjectRepository(GenerationRequest) private readonly generationRequestRepository: Repository<GenerationRequest>,
		private readonly mailService: MailService,
		private readonly configService: AppConfigService
	) { }

	async findByEmail(email: string): Promise<User | null> {
		return this.userRepository.findOne({ where: { email } });
	}

	async findById(id: number): Promise<User | null> {
		return this.userRepository.findOne({ where: { id } });
	}

	/**
	 * Request magic link for email
	 */
	async requestMagicLink(email: string): Promise<void> {
		// Find or create user
		let user = await this.findByEmail(email);
		if (!user) {
			user = this.userRepository.create({ email });
		}

		// Generate magic token
		const token = crypto.randomBytes(32).toString('hex');
		const expiresAt = new Date();
		expiresAt.setMinutes(expiresAt.getMinutes() + this.configService.magicLink.expiryMinutes);

		// Save token
		user.magicToken = token;
		user.magicTokenExpiresAt = expiresAt;
		await this.userRepository.save(user);

		// Send email
		await this.mailService.sendMagicLink(email, token);
	}

	/**
	 * Verify magic link token
	 */
	async verifyMagicLink(token: string): Promise<User | null> {
		const user = await this.userRepository.findOne({
			where: {
				magicToken: token,
				magicTokenExpiresAt: MoreThan(new Date())
			}
		});

		if (!user) {
			return null;
		}

		// Clear token after use
		user.magicToken = null;
		user.magicTokenExpiresAt = null;
		await this.userRepository.save(user);

		return user;
	}

	/**
	 * Migrate anonymous GenerationRequests from session to user
	 */
	async migrateSessionToUser(sessionId: string, userId: number): Promise<number> {
		const result = await this.generationRequestRepository.update(
			{ sessionId, userId: IsNull() }, // anonymous requests from this session
			{ userId, sessionId: null } // assign to user, clear sessionId
		);

		return result.affected || 0;
	}
}

export { AuthService };
