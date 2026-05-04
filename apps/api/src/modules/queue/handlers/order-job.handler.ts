import { AiModelsConfigService } from '@/modules/ai-models/services/ai-models-config.service';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Order } from '@/modules/orders/entities/order.entity';
import { OrdersService } from '@/modules/orders/services/orders.service';
import { OrderStatus } from '@/enums/order-status.enum';
import { GenerationStrategyFactory } from '@/modules/generations/strategies/generation-strategy.factory';
import { GeminiService } from '@/modules/generations/services/models/gemini.service';
import { OllamaService } from '@/modules/generations/services/models/ollama.service';
import { AbstractLlmService } from '@/modules/generations/services/models/abstractLlm.service';
import { RequestQueueService } from '@/modules/generations/services/request-queue/request-queue.service';
import { AiModelConfig } from '@/modules/ai-models/entities/ai-model-config.entity';
import { Repository } from 'typeorm';

@Injectable()
class OrderJobHandler {
	private readonly logger = new Logger(OrderJobHandler.name);

	constructor(
		private readonly aiModelsConfigService: AiModelsConfigService,
		private readonly generationStrategyFactory: GenerationStrategyFactory,
		private readonly ordersService: OrdersService,
		private readonly requestQueue: RequestQueueService,
		@InjectRepository(Order) private readonly orderRepository: Repository<Order>
	) {}

	private createLlmProvider(modelConfig: AiModelConfig): AbstractLlmService {
		if (modelConfig.serviceClass.includes('gemini')) return new GeminiService(modelConfig, this.requestQueue);
		if (modelConfig.serviceClass.includes('ollama')) return new OllamaService(modelConfig, this.requestQueue);
		throw new Error(`Unknown serviceClass: ${modelConfig.serviceClass}`);
	}

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
		const provider = this.createLlmProvider(modelConfig);
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
