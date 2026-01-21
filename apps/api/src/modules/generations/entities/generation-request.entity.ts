import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index, type Relation } from 'typeorm';
import { Generation } from './generation.entity';
import { User } from '../../auth/entitites/user.entity';
import { GenerationRequestStatus, type GenerationRequestStatusValue } from '../../../enums/generation-request-status.enum';

@Entity('generation_requests')
class GenerationRequest {
	@PrimaryGeneratedColumn()
	public id: number;

	@Column({ type: 'int', unsigned: true, name: 'generation_id' })
	@Index('idx_generation')
	public generationId: number;

	@ManyToOne(() => Generation, generation => generation.requests, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'generation_id' })
	public generation: Relation<Generation>;

	@Column({ type: 'int', unsigned: true, nullable: true, name: 'user_id' })
	@Index('idx_user')
	public userId: number | null;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id' })
	public user: User | null;

	@Column({ type: 'varchar', length: 128, nullable: true, name: 'session_id' })
	@Index('idx_session')
	public sessionId: string | null;

	/**
	 * Checkout Session URL для Stripe Checkout
	 * Формат: https://checkout.stripe.com/c/pay/cs_...
	 */
	@Column({ type: 'varchar', length: 500, nullable: true, name: 'checkout_session_url' })
	public checkoutSessionUrl: string | null;

	/**
	 * Payment Intent Client Secret для Stripe Elements
	 * Формат: pi_xxx_secret_yyy
	 */
	@Column({ type: 'varchar', length: 500, nullable: true, name: 'payment_intent_client_secret' })
	public paymentIntentClientSecret: string | null;

	@Column({ type: 'smallint', default: GenerationRequestStatus.PENDING_PAYMENT.value })
	public status: GenerationRequestStatusValue;

	@CreateDateColumn({ name: 'created_at' })
	public createdAt: Date;

	public isAnonymous(): boolean {
		return this.userId === null && this.sessionId !== null;
	}
}

export { GenerationRequest };
