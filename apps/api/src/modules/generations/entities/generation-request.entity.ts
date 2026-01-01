import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Generation } from './generation.entity';
import { User } from '../../auth/entitites/user.entity';

@Entity('generation_requests')
class GenerationRequest {
	@PrimaryGeneratedColumn()
	public id: number;

	@Column({ type: 'int', unsigned: true, name: 'generation_id' })
	@Index('idx_generation')
	public generationId: number;

	@ManyToOne(() => Generation, generation => generation.requests, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'generation_id' })
	public generation: Generation;

	@Column({ type: 'int', unsigned: true, nullable: true, name: 'user_id' })
	@Index('idx_user')
	public userId: number | null;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id' })
	public user: User | null;

	@Column({ type: 'varchar', length: 128, nullable: true, name: 'session_id' })
	@Index('idx_session')
	public sessionId: string | null;

	@CreateDateColumn({ name: 'requested_at' })
	public requestedAt: Date;

	public isAnonymous(): boolean {
		return this.userId === null && this.sessionId !== null;
	}
}

export { GenerationRequest };
