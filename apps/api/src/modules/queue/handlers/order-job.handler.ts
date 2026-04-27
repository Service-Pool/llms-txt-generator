import { AiModelsConfigService } from '@/modules/ai-models/services/ai-models-config.service';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { LLMProviderFactory } from '@/modules/generations/services/llm-provider-factory.service';
import { Order } from '@/modules/orders/entities/order.entity';
import { OrdersService } from '@/modules/orders/services/orders.service';
import { OrderStatus } from '@/enums/order-status.enum';
import { GenerationStrategyFactory } from '@/modules/generations/strategies/generation-strategy.factory';
import { Repository } from 'typeorm';

@Injectable()
class OrderJobHandler {
	private readonly logger = new Logger(OrderJobHandler.name);

	constructor(
		private readonly aiModelsConfigService: AiModelsConfigService,
		private readonly llmProviderFactory: LLMProviderFactory,
		private readonly generationStrategyFactory: GenerationStrategyFactory,
		private readonly ordersService: OrdersService,
		@InjectRepository(Order) private readonly orderRepository: Repository<Order>
	) {}

	public async handle(job: Job<{ orderId: number }>): Promise<void> {
		this.logger.log(`Handling job ${job.id}, data: ${JSON.stringify(job.data)}`);

		const { orderId } = job.data;

		if (!orderId) {
			throw new Error(`Job ${job.id} has no orderId in data: ${JSON.stringify(job.data)}`);
		}

		const order = await this.orderRepository.findOne({ where: { id: orderId } });

		if (!order) {
			throw new Error(`Order ${orderId} not found`);
		}

		if (!order.modelId) {
			throw new Error(`Order ${orderId} has no modelId`);
		}

		if (!order.strategy) {
			throw new Error(`Order ${orderId} has no strategy`);
		}

		const modelConfig = this.aiModelsConfigService.getModelById(order.modelId);
		const provider = await this.llmProviderFactory.getProvider(order.modelId);
		const strategy = this.generationStrategyFactory.create(order.strategy);

		await this.ordersService.updateOrderStatus(orderId, OrderStatus.PROCESSING);
		await job.updateProgress({});

		try {
			this.logger.log(`Processing order ${orderId} with strategy "${order.strategy}"`);

			const output = await strategy.execute(order, provider, modelConfig, job, job.attemptsMade + 1);

			await this.orderRepository.update(orderId, {
				output,
				status: OrderStatus.COMPLETED,
				completedAt: new Date()
			});

			await job.updateProgress({});

			this.logger.log(`Order ${orderId} completed successfully`);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			await this.ordersService.updateOrderStatus(orderId, OrderStatus.FAILED);
			await this.ordersService.addError(orderId, errorMessage);

			this.logger.error(`Order ${orderId} failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
			throw error;
		}
	}
}

export { OrderJobHandler };
