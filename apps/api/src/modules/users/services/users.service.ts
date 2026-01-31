import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
class UsersService {
	constructor(
		@InjectRepository(User)
		private readonly userRepository: Repository<User>
	) { }

	/**
	 * Получить пользователя по email
	 */
	async findByEmail(email: string): Promise<User | null> {
		return this.userRepository.findOne({ where: { email } });
	}

	/**
	 * Получить пользователя по ID
	 */
	async findById(id: number): Promise<User | null> {
		return this.userRepository.findOne({ where: { id } });
	}

	/**
	 * Создать нового пользователя
	 */
	async create(email: string): Promise<User> {
		const user = this.userRepository.create({ email });
		return this.userRepository.save(user);
	}

	/**
	 * Получить или создать пользователя по email
	 */
	async getOrCreate(email: string): Promise<User> {
		let user = await this.findByEmail(email);

		if (!user) {
			user = await this.create(email);
		}

		return user;
	}

	/**
	 * Сохранить loginToken для пользователя
	 */
	async saveLoginToken(userId: number, token: string, expiresAt: Date): Promise<void> {
		await this.userRepository.update(userId, {
			loginToken: token,
			loginTokenExpiresAt: expiresAt
		});
	}

	/**
	 * Очистить loginToken после использования
	 */
	async clearLoginToken(userId: number): Promise<void> {
		await this.userRepository.update(userId, {
			loginToken: null,
			loginTokenExpiresAt: null
		});
	}

	/**
	 * Найти пользователя по loginToken
	 */
	async findByLoginToken(token: string): Promise<User | null> {
		return this.userRepository.findOne({
			where: { loginToken: token }
		});
	}
}

export { UsersService }
