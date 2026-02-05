import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { OrderStatus } from '../../../enums/order-status.enum';

/**
 * Stats Service
 * Provides statistics about completed orders
 */
@Injectable()
class StatsService {
	private readonly logger = new Logger(StatsService.name);

	constructor(@InjectRepository(Order)
	private readonly orderRepository: Repository<Order>) { }

	/**
	 * Get count of completed orders
	 */
	async getCompletedCount(): Promise<number> {
		const count = await this.orderRepository.count({
			where: { status: OrderStatus.COMPLETED }
		});

		this.logger.debug(`Completed orders count: ${count}`);
		return count;
	}

	/**
	 * Get aggregated statistics
	 */
	async getStats(): Promise<{ completed: number }> {
		const completed = await this.getCompletedCount();

		return { completed };
	}
}

export { StatsService };
