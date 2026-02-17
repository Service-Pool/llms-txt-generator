import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { ClsService } from 'nestjs-cls';
import { Session as SessionData } from 'fastify';

@Injectable()
class UsersService {
	constructor(
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
		private readonly cls: ClsService
	) { }

	/**
	 * Получить данные текущей сессии из CLS
	 */
	public getSessionData(): SessionData {
		return this.cls.get<SessionData>('sessionData');
	}

	/**
	 * Создать временную сессию для webhook (без реального sessionId)
	 * Используется когда нужно выполнить операцию от имени пользователя вне HTTP-запроса
	 */
	public setTemporarySessionData(userId: number): void {
		const tempSessionData: SessionData = {
			userId,
			sessionId: `webhook-${userId}-${Date.now()}`,
			cookie: {
				path: '/',
				httpOnly: true,
				secure: false,
				sameSite: 'strict' as const,
				maxAge: 0,
				expires: new Date(),
				domain: null,
				originalMaxAge: 0,
				originalExpires: new Date()
			}
		};

		this.cls.set('sessionData', tempSessionData);
	}

	/**
	 * Очистить временную сессию после использования
	 */
	public clearSessionData(): void {
		this.cls.set('sessionData', undefined);
	}

	/**
	 * Получить текущего аутентифицированного пользователя
	 * Возвращает null для анонимных пользователей
	 */
	public async getCurrentUser(): Promise<User | null> {
		const session = this.getSessionData();
		const userId = session.userId;

		if (!userId) {
			return null;
		}

		return this.findById(userId);
	}

	/**
	 * Получить пользователя по email
	 */
	public async findByEmail(email: string): Promise<User | null> {
		return this.userRepository.findOne({ where: { email } });
	}

	/**
	 * Получить пользователя по ID
	 */
	public async findById(id: number): Promise<User | null> {
		return this.userRepository.findOne({ where: { id } });
	}

	/**
	 * Создать нового пользователя
	 */
	public async create(email: string): Promise<User> {
		const user = this.userRepository.create({ email });
		return this.userRepository.save(user);
	}

	/**
	 * Получить или создать пользователя по email
	 */
	public async getOrCreate(email: string): Promise<User> {
		let user = await this.findByEmail(email);

		if (!user) {
			user = await this.create(email);
		}

		return user;
	}

	/**
	 * Сохранить loginToken для пользователя
	 */
	public async saveLoginToken(userId: number, token: string, expiresAt: Date): Promise<void> {
		await this.userRepository.update(userId, {
			loginToken: token,
			loginTokenExpiresAt: expiresAt
		});
	}

	/**
	 * Очистить loginToken после использования
	 */
	public async clearLoginToken(userId: number): Promise<void> {
		await this.userRepository.update(userId, {
			loginToken: null,
			loginTokenExpiresAt: null
		});
	}

	/**
	 * Найти пользователя по loginToken
	 */
	public async findByLoginToken(token: string): Promise<User | null> {
		return this.userRepository.findOne({
			where: { loginToken: token }
		});
	}
}

export { UsersService };
