import { Controller, Post, Headers, RawBody, BadRequestException, Logger } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GenerationRequest } from '../generations/entities/generation-request.entity';
import { Generation } from '../generations/entities/generation.entity';
import { GenerationStatus } from '../../enums/generation-status.enum';
import { GenerationRequestStatus, PAID_THRESHOLD } from '../../enums/generation-request-status.enum';
import { GenerationJobMessage } from '../queue/messages/generation-job.message';
import { JobUtils } from '../../utils/job.utils';
import { QueueService } from '../queue/queue.service';
import { AppConfigService } from '../../config/config.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GenerationRequestUpdateEvent } from '../websocket/websocket.events';
import { GenerationRequestDtoResponse } from '../generations/dto/generation-response.dto';
import type Stripe from 'stripe';

@Controller('api/stripe')
class StripeController {
	private readonly logger = new Logger(StripeController.name);

	constructor(
		private readonly stripeService: StripeService,
		private readonly queueService: QueueService,
		private readonly configService: AppConfigService,
		private readonly eventEmitter: EventEmitter2,
		@InjectRepository(GenerationRequest) private readonly generationRequestRepository: Repository<GenerationRequest>,
		@InjectRepository(Generation) private readonly generationRepository: Repository<Generation>
	) { }

	@Post('webhook')
	async handleWebhook(@Headers('stripe-signature') signature: string, @RawBody() rawBody: Buffer) {
		// КРИТИЧЕСКИ ВАЖНО: Проверка подписи Stripe
		this.logger.log(`Webhook received: rawBody type=${typeof rawBody}, length=${rawBody?.length || 0}, signature=${signature?.substring(0, 20)}...`);

		let event: Stripe.Event;

		try {
			event = this.stripeService.constructWebhookEvent(rawBody, signature);
		} catch (err: unknown) {
			const errorMessage = err instanceof Error ? err.message : 'Unknown error';
			this.logger.error('Webhook signature verification failed', errorMessage);
			throw new BadRequestException('Invalid signature');
		}

		// Обработка события
		switch (event.type) {
			case 'checkout.session.completed': {
				const session = event.data.object;
				const generationRequestId = parseInt(session.metadata!.generationRequestId);
				await this.processPaymentSuccess(generationRequestId);
				break;
			}
			case 'payment_intent.succeeded': {
				const paymentIntent = event.data.object;
				const generationRequestId = parseInt(paymentIntent.metadata.generationRequestId);
				await this.processPaymentSuccess(generationRequestId);
				break;
			}
		}

		return { received: true };
	}

	/**
	 * Обработка успешной оплаты (для Checkout и Elements)
	 */
	private async processPaymentSuccess(generationRequestId: number): Promise<void> {
		// Загрузить GenerationRequest с Generation
		const generationRequest = await this.generationRequestRepository.findOne({
			where: { id: generationRequestId },
			relations: ['generation', 'generation.calculation']
		});

		if (!generationRequest) {
			this.logger.error(`GenerationRequest ${generationRequestId} not found`);
			return;
		}

		const generation = generationRequest.generation;

		// Идемпотентность: если уже оплачено, не делать повторно
		if (generationRequest.status < PAID_THRESHOLD) {
			generationRequest.status = GenerationRequestStatus.ACCEPTED.value;
			generation.status = GenerationStatus.WAITING;

			await this.generationRequestRepository.save(generationRequest);
			await this.generationRepository.save(generation);

			// Отправить WebSocket событие об обновлении запроса
			const dto = GenerationRequestDtoResponse.fromEntity(generationRequest);
			this.eventEmitter.emit('generation.request.update', new GenerationRequestUpdateEvent(dto));

			// Поставить в очередь
			const message = new GenerationJobMessage(
				generation.id,
				generationRequest.id,
				generation.provider
			);

			const providerConfig = this.configService.providers[generation.provider];
			const jobId = JobUtils.generateId(generation.id);

			await this.queueService.send(providerConfig.queueName, message, jobId);

			this.logger.log(`Payment success processed for GenerationRequest ${generationRequestId}`);
		}
	}
}

export { StripeController };
