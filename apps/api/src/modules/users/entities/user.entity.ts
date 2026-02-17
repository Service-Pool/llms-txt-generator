import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';

@Entity('users')
class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ unique: true })
	email: string;

	@Column({ type: 'varchar', length: 255, nullable: true })
	loginToken: string | null;

	@Column({ type: 'datetime', nullable: true })
	loginTokenExpiresAt: Date | null;

	@OneToMany(() => Order, order => order.user)
	orders: Order[];

	@CreateDateColumn({ utc: true })
	createdAt: Date;

	@UpdateDateColumn({ utc: true })
	updatedAt: Date;
}

export { User };
