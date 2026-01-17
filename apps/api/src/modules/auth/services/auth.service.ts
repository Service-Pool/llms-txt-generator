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

	/**
	 * Шифрует строку с помощью AES-256-CBC
	 */
	private encryptAES(plainText: string): string {
		const cipher = crypto.createCipheriv(
			'aes-256-cbc',
			Buffer.from(this.configService.security.aesKey, 'base64'),
			Buffer.from(this.configService.security.aesIv, 'base64')
		);
		let encrypted = cipher.update(plainText, 'utf8', 'base64');
		encrypted += cipher.final('base64');
		return encrypted;
	}

	/**
	 * Дешифрует строку с помощью AES-256-CBC
	 */
	public decryptAES(data: string): string {
		const decipher = crypto.createDecipheriv(
			'aes-256-cbc',
			Buffer.from(this.configService.security.aesKey, 'base64'),
			Buffer.from(this.configService.security.aesIv, 'base64')
		);
		let decrypted = decipher.update(data, 'base64', 'utf8');
		decrypted += decipher.final('utf8');
		return decrypted;
	}

	async findByEmail(email: string): Promise<User | null> {
		return this.userRepository.findOne({ where: { email } });
	}

	async findById(id: number): Promise<User | null> {
		return this.userRepository.findOne({ where: { id } });
	}

	/**
	 * Request login link for email
	 */
	async requestLoginLink(email: string, redirectUrl?: string): Promise<void> {
		// Find or create user
		let user = await this.findByEmail(email);
		if (!user) {
			user = this.userRepository.create({ email });
		}

		// Generate login token
		const token = crypto.randomBytes(32).toString('hex');
		const expiresAt = new Date();
		expiresAt.setMinutes(expiresAt.getMinutes() + this.configService.loginLink.expiryMinutes);

		// Save token
		user.loginToken = token;
		user.loginTokenExpiresAt = expiresAt;
		await this.userRepository.save(user);

		// Формируем query-объект и шифруем
		const queryStr = JSON.stringify({ token, redirectUrl });
		const encryptedQuery = this.encryptAES(queryStr);
		await this.mailService.sendLoginLink(email, encryptedQuery);
	}

	/**
	 * Verify login link token
	 */
	async verifyLoginLink(token: string): Promise<User | null> {
		const user = await this.userRepository.findOne({
			where: {
				loginToken: token,
				loginTokenExpiresAt: MoreThan(new Date())
			}
		});

		if (!user) {
			return null;
		}

		// Clear token after use
		user.loginToken = null;
		user.loginTokenExpiresAt = null;
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
