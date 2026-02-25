import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Currency } from '@/enums/currency.enum';
import { OrderStatus } from '@/enums/order-status.enum';
import { User } from '@/modules/users/entities/user.entity';
import { AiModelConfig } from '@/modules/ai-models/entities/ai-model-config.entity';

@Entity('orders')
class Order {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'int', nullable: true })
	userId: number | null;

	@Column({ type: 'varchar', nullable: true })
	sessionId: string | null;

	@Column()
	hostname: string;

	@Column({ type: 'varchar', nullable: true })
	modelId: string | null;

	@Column({
		type: 'decimal', precision: 11, scale: 6, nullable: true, transformer: {
			to: (value: number | null) => value,
			from: (value: string | null) => value ? parseFloat(value) : null
		}
	})
	priceTotal: number | null;

	@Column({ type: 'enum', enum: Currency, nullable: true })
	priceCurrency: Currency | null;

	@Column({
		type: 'decimal', precision: 11, scale: 6, nullable: true, transformer: {
			to: (value: number | null) => value,
			from: (value: string | null) => value ? parseFloat(value) : null
		}
	})
	pricePerUrl: number | null;

	@Column({ type: 'varchar', nullable: true })
	stripeSessionId: string | null;

	@Column({ type: 'varchar', nullable: true })
	stripePaymentIntentSecret: string | null;

	@Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.CREATED })
	status: OrderStatus;

	@Column({ type: 'varchar', nullable: true })
	jobId: string | null;

	@Column({ type: 'int', nullable: true })
	totalUrls: number | null;

	@Column({ default: 0 })
	processedUrls: number;

	@Column({ type: 'datetime', nullable: true, utc: true })
	startedAt: Date | null;

	@Column({ type: 'datetime', nullable: true, utc: true })
	completedAt: Date | null;

	@Column({ type: 'longtext', nullable: true })
	output: string | null;

	@Column({ type: 'json', nullable: true })
	errors: string[] | null;

	@ManyToOne(() => User, user => user.orders)
	@JoinColumn({ name: 'userId' })
	user: User;

	@CreateDateColumn({ utc: true })
	createdAt: Date;

	@UpdateDateColumn({ utc: true })
	updatedAt: Date;

	@DeleteDateColumn({ type: 'datetime', nullable: true, utc: true })
	deletedAt: Date | null;

	/**
	 * Synthetic property populated by OrderSubscriber.
	 * Contains model configuration if modelId is set.
	 */
	aiModelConfig: AiModelConfig | null = null;
}

export { Order };
