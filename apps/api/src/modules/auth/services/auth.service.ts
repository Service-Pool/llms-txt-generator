import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Session } from 'fastify';
import { AppConfigService } from '../../../config/config.service';
import { MailService } from './mail.service';
import { UsersService } from '../../users/services/users.service';
import { OrdersService } from '../../orders/services/orders.service';
import { User } from '../../users/entities/user.entity';
import * as crypto from 'crypto';

@Injectable()
class AuthService {
	private readonly logger = new Logger(AuthService.name);

	constructor(
		private readonly usersService: UsersService,
		private readonly ordersService: OrdersService,
		private readonly mailService: MailService,
		private readonly configService: AppConfigService
	) { }

	/**
	 * Отправить Magic Link на email
	 */
	public async requestLoginLink(email: string, redirectUrl: string): Promise<void> {
		// Валидация redirectUrl
		this.validateRedirectUrl(redirectUrl);

		// Получить или создать пользователя
		const user = await this.usersService.getOrCreate(email);

		// Сгенерировать токен
		const token = crypto.randomBytes(32).toString('hex');
		const expiresAt = new Date();
		expiresAt.setMinutes(expiresAt.getMinutes() + this.configService.loginLink.expiryMinutes);

		// Сохранить токен в базе
		await this.usersService.saveLoginToken(user.id, token, expiresAt);

		// Зашифровать query для безопасности
		const queryStr = JSON.stringify({ token, redirectUrl });
		const encryptedQuery = this.encryptAES(queryStr);

		// Отправить письмо
		await this.mailService.sendLoginLink(email, redirectUrl, encryptedQuery);

		this.logger.log(`Login link requested for ${email}`);
	}

	/**
	 * Авторизация пользователя по зашифрованным credentials
	 * @param encryptedCrd Зашифрованная строка с token и redirectUrl
	 * @param session Session объект для сохранения userId
	 * @returns Объект с user и redirectUrl
	 * @throws UnauthorizedException если токен невалиден или истек
	 */
	public async login(encryptedCrd: string, session: Session): Promise<{ user: User; redirectUrl: string }> {
		// Расшифровать credentials
		const decrypted = this.decryptAES(encryptedCrd);
		const { token, redirectUrl } = JSON.parse(decrypted) as { token: string; redirectUrl: string };

		// Проверить токен
		const user = await this.verifyUserToken(token);

		if (!user) {
			throw new UnauthorizedException('Invalid login link');
		}

		// Очистить токен после использования
		await this.usersService.clearLoginToken(user.id);

		// Сохранить userId в сессию
		session.userId = user.id;

		// Перенести заказы из текущей сессии
		const sessionId = session.sessionId;

		if (sessionId) {
			await this.transferSessionOrders(sessionId, user.id);
		}

		this.logger.log(`User ${user.email} successfully logged in`);
		return { user, redirectUrl };
	}

	/**
	 * Выход из системы
	 * @param session Session объект для очистки userId
	 * @throws Error если пользователь не авторизован
	 */
	public logout(session: Session): void {
		if (!session.userId) {
			throw new UnauthorizedException('Not authorized');
		}

		const userId = session.userId;

		// Удалить userId из сессии
		session.userId = null;

		this.logger.log(`User ${userId} logged out`);
	}

	/**
	 * Получить текущего пользователя
	 */
	public async status(): Promise<{ user: User | null; sessionId: string }> {
		const session = this.usersService.getSessionData();

		if (!session.userId) {
			return { user: null, sessionId: session.sessionId };
		}

		const user = await this.usersService.findById(session.userId);
		return { user, sessionId: session.sessionId };
	}

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
	private decryptAES(data: string): string {
		const decipher = crypto.createDecipheriv(
			'aes-256-cbc',
			Buffer.from(this.configService.security.aesKey, 'base64'),
			Buffer.from(this.configService.security.aesIv, 'base64')
		);
		let decrypted = decipher.update(data, 'base64', 'utf8');
		decrypted += decipher.final('utf8');
		return decrypted;
	}

	/**
	 * Проверить валидность токена без его использования
	 */
	private async verifyUserToken(token: string): Promise<User | false> {
		const user = await this.usersService.findByLoginToken(token);

		if (!user) {
			return false;
		}

		// Проверить срок действия токена
		if (!user.loginTokenExpiresAt || user.loginTokenExpiresAt < new Date()) {
			return false;
		}

		return user;
	}

	/**
	 * Перенести Orders из session в user account
	 */
	private async transferSessionOrders(sessionId: string, userId: number): Promise<number> {
		const transferred = await this.ordersService.transferSessionOrders(sessionId, userId);

		if (transferred > 0) {
			this.logger.log(`Transferred ${transferred} orders from session ${sessionId} to user ${userId}`);
		}

		return transferred;
	}

	/**
	 * Валидирует redirect URL против whitelist доменов
	 * Если allowedDomains содержит '*', разрешает любые HTTPS URL
	 */
	private validateRedirectUrl(url: string): void {
		const allowedDomains = this.configService.allowedDomains;

		// Если в whitelist есть '*', разрешаем любые HTTPS URLs
		if (allowedDomains.includes('*')) {
			try {
				const urlObj = new URL(url);
				if (urlObj.protocol !== 'https:' && urlObj.protocol !== 'http:') {
					throw new Error('Only HTTP(S) URLs are allowed');
				}
				return;
			} catch (error) {
				throw new Error(`Invalid redirect URL: ${error instanceof Error ? error.message : String(error)}`);
			}
		}

		// Проверка против whitelist
		const isAllowed = allowedDomains.some(domain => url.startsWith(domain));
		if (!isAllowed) {
			throw new Error(`Redirect URL ${url} is not allowed. Allowed domains: ${allowedDomains.join(', ')}`);
		}
	}
}

export { AuthService };
