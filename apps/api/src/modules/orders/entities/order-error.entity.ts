import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import type { Order } from '@/modules/orders/entities/order.entity';

@Entity('order_errors')
@Index(['orderId', 'createdAt'])
class OrderError {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'int' })
	orderId: number;

	@Column({ type: 'longtext' })
	message: string;

	@CreateDateColumn({ utc: true })
	createdAt: Date;

	@ManyToOne('Order', { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'orderId' })
	order: Order;
}

export { OrderError };
