import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, type Relation } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';

@Entity('snapshot_urls')
class SnapshotUrl {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	orderId: number;

	@Column({ type: 'text' })
	url: string;

	@Column()
	title: string;

	@Column()
	contentHash: string;

	@ManyToOne(() => Order, order => order.snapshotUrls, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'orderId' })
	order: Relation<Order>;

	@CreateDateColumn({ utc: true })
	createdAt: Date;
}

export { SnapshotUrl };
