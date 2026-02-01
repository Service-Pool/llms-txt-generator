import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

// Тип для данных сессии, хранимых в БД (без методов FastifySessionObject)
interface SessionData {
	userId?: number;
	sessionId: string;
	cookie: {
		originalMaxAge: number | null;
		maxAge?: number | null;
		expires?: Date | null;
		secure?: boolean;
		httpOnly?: boolean;
		domain?: string;
		path?: string;
		sameSite?: boolean | 'lax' | 'strict' | 'none';
	};
}

@Entity('sessions')
class Session {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ unique: true })
	sessionId: string;

	@Column({ type: 'int', nullable: true })
	userId: number | null;

	@ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'userId' })
	user: User | null;

	@Column({ type: 'json' })
	data: SessionData;

	@Column({ type: 'datetime', utc: true })
	expiresAt: Date;

	@CreateDateColumn({ utc: true })
	createdAt: Date;

	@Column({ utc: true })
	updatedAt: Date;
}

export { Session, SessionData };
