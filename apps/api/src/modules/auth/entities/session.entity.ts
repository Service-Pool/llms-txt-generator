import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('sessions')
export class Session {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ unique: true })
	sessionId: string;

	@Column({ type: 'int', nullable: true })
	userId: number | null;

	@ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'userId' })
	user: User | null;

	@Column({ type: 'text' })
	data: string;

	@Column({ type: 'datetime', utc: true })
	expiresAt: Date;

	@CreateDateColumn({ utc: true })
	createdAt: Date;

	@Column({ utc: true })
	updatedAt: Date;
}
