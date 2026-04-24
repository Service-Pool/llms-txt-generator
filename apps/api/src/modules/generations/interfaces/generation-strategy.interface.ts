import type { Job } from 'bullmq';
import type { Order } from '@/modules/orders/entities/order.entity';
import type { AbstractLlmService } from '@/modules/generations/services/models/abstractLlm.service';

interface IGenerationStrategy {
	execute(order: Order, provider: AbstractLlmService, batchSize: number, job: Job, attempt: number): Promise<string>;
}

export { IGenerationStrategy };
