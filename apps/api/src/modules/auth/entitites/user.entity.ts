import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
class User {
	@PrimaryGeneratedColumn({ unsigned: true })
	id: number;

	@Column({ type: 'varchar', length: 255, unique: true })
	email: string;

	@Column({ type: 'varchar', length: 255, nullable: true, name: 'login_token' })
	loginToken: string | null;

	@Column({ type: 'timestamp', nullable: true, name: 'login_token_expires_at' })
	loginTokenExpiresAt: Date | null;

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt: Date;
}

export { User };
