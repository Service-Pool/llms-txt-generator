import { GenerationRequest } from '../../generations/entities/generation-request.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User } from '../entitites/user.entity';

@Injectable()
class AuthService {
	constructor(
		@InjectRepository(User) private readonly userRepository: Repository<User>,
		@InjectRepository(GenerationRequest) private readonly generationRequestRepository: Repository<GenerationRequest>
	) { }

	async findByEmail(email: string): Promise<User | null> {
		return this.userRepository.findOne({ where: { email } });
	}

	async findById(id: number): Promise<User | null> {
		return this.userRepository.findOne({ where: { id } });
	}

	async createUser(username: string, password: string, email: string): Promise<User> {
		const hashedPassword = await User.hashPassword(password);
		const user = this.userRepository.create({
			email,
			password: hashedPassword
		});
		return this.userRepository.save(user);
	}

	async validateUser(email: string, password: string): Promise<User | null> {
		const user = await this.findByEmail(email);
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
