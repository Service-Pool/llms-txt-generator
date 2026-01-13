import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Entity('users')
class User {
	@PrimaryGeneratedColumn({ unsigned: true })
	id: number;

	@Column({ type: 'varchar', length: 255, unique: true })
	email: string;

	@Column({ type: 'varchar', length: 255 })
	password: string;

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt: Date;

	static async hashPassword(plainPassword: string): Promise<string> {
		return await bcrypt.hash(plainPassword, 10);
	}

	static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
		if (!hashedPassword && !plainPassword) {
			return true;
		}
		if (!hashedPassword || !plainPassword) {
			return false;
		}
		return await bcrypt.compare(plainPassword, hashedPassword);
	}
}

export { User };
