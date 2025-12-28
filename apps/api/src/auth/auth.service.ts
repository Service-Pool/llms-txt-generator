import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User } from './entitites/user.entity';
import { GenerationRequest } from '../generations/entities/generation-request.entity';

@Injectable()
class AuthService {
	constructor(
		@InjectRepository(User) private readonly userRepository: Repository<User>,
		@InjectRepository(GenerationRequest) private readonly generationRequestRepository: Repository<GenerationRequest>
	) {}

	async findByUsername(username: string): Promise<User | null> {
		return this.userRepository.findOne({ where: { username } });
	}

	async findById(id: number): Promise<User | null> {
		return this.userRepository.findOne({ where: { id } });
	}

	async createUser(username: string, password: string | null, email: string | null): Promise<User> {
		const hashedPassword = await User.hashPassword(password);
		const user = this.userRepository.create({
			username,
			password: hashedPassword,
			email
		});
		return this.userRepository.save(user);
	}

	async validateUser(username: string, password: string | null): Promise<User | null> {
		const user = await this.findByUsername(username);
		if (!user) {
			return null;
		}

		const isValid = await User.verifyPassword(password, user.password);
		if (!isValid) {
			return null;
		}

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
