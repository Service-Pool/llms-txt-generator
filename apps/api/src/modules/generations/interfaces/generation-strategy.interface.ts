import type { Job } from 'bullmq';
import type { Order } from '@/modules/orders/entities/order.entity';
import type { AbstractLlmService } from '@/modules/generations/services/models/abstractLlm.service';
import type { AiModelConfig } from '@/modules/ai-models/entities/ai-model-config.entity';

interface IGenerationStrategy {
	execute(order: Order, provider: AbstractLlmService, modelConfig: AiModelConfig, job: Job, attempt: number): Promise<string>;
}

export { IGenerationStrategy };
