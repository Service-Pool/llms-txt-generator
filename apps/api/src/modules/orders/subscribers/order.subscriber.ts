import { Injectable } from '@nestjs/common';
import { DataSource, EntitySubscriberInterface, EventSubscriber } from 'typeorm';
import { Order } from '../entities/order.entity';
import { AiModelsConfigService } from '../../ai-models/services/ai-models-config.service';

@Injectable()
@EventSubscriber()
class OrderSubscriber implements EntitySubscriberInterface<Order> {
	constructor(
		private readonly dataSource: DataSource,
		private readonly aiModelsConfigService: AiModelsConfigService
	) {
		this.dataSource.subscribers.push(this);
	}

	listenTo() {
		return Order;
	}

	/**
	 * Called after entity is loaded from the database.
	 * Enriches order with model config if modelId is present.
	 */
	afterLoad(entity: Order): void {
		if (entity.modelId) {
			entity.modelConfig = this.aiModelsConfigService.getModelById(entity.modelId);
		}
	}
}

export { OrderSubscriber };
