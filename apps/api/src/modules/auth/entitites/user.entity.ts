import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Entity('users')
class User {
	@PrimaryGeneratedColumn({ unsigned: true })
	id: number;

	@Column({ type: 'varchar', length: 255, unique: true })
	username: string;

	@Column({ type: 'varchar', length: 255, unique: true, nullable: true })
	email: string | null;

	@Column({ type: 'varchar', length: 255, nullable: true })
	password: string | null;

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt: Date;

	static async hashPassword(plainPassword: string | null): Promise<string | null> {
		if (!plainPassword) {
			return null;
		}
		return await bcrypt.hash(plainPassword, 10);
	}

	static async verifyPassword(plainPassword: string | null, hashedPassword: string | null): Promise<boolean> {
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
