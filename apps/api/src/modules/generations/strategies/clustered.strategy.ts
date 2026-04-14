import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IGenerationStrategy } from '@/modules/generations/interfaces/generation-strategy.interface';
import type { Order } from '@/modules/orders/entities/order.entity';
import type { AbstractLlmService } from '@/modules/generations/services/models/abstractLlm.service';

@Injectable()
class ClusteredStrategy implements IGenerationStrategy {
	private readonly logger = new Logger(ClusteredStrategy.name);

	public execute(order: Order, _provider: AbstractLlmService, _batchSize: number, _job: Job): Promise<string> {
		this.logger.log(`ClusteredStrategy is not yet implemented for order ${order.id}`);
		throw new Error('ClusteredStrategy is not yet implemented');
	}
}

export { ClusteredStrategy };
