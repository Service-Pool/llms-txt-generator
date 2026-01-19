import { AppConfigService } from '../../../config/config.service';
import { Calculation } from '../../calculations/entities/calculation.entity';
import { ClsService } from 'nestjs-cls';
import { Generation } from '../entities/generation.entity';
import { GenerationJobMessage } from '../../queue/messages/generation-job.message';
import { GenerationRequest } from '../entities/generation-request.entity';
import { GenerationRequestsListDtoResponse, GenerationRequestDtoResponse, PaymentLinkDtoResponse } from '../dto/generation-response.dto';
import { GenerationRequestStatus, PAID_THRESHOLD } from '../../../enums/generation-request-status.enum';
import { GenerationsService } from './generations.service';
import { GenerationStatus } from '../../../enums/generation-status.enum';
import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JobUtils } from '../../../utils/job.utils';
import { Provider } from '../../../enums/provider.enum';
import { ProviderPrices } from '../../calculations/models/provider-prices.model';
import { QueueService } from '../../queue/queue.service';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { StripeService } from '../../stripe/stripe.service';
import { type UserClsStore } from '../../auth/models/user-context.model';

@Injectable()
class GenerationRequestService {
	private readonly logger = new Logger(GenerationRequestService.name);

	public constructor(
		private readonly generationsService: GenerationsService,
		private readonly queueService: QueueService,
		private readonly configService: AppConfigService,
		private readonly stripeService: StripeService,
		private readonly dataSource: DataSource,
		private readonly cls: ClsService<UserClsStore>,
		@InjectRepository(GenerationRequest) private readonly generationRequestRepository: Repository<GenerationRequest>
	) { }

	private get user(): UserClsStore {
		return {
			userId: this.cls.get('userId'),
			sessionId: this.cls.get('sessionId')
		};
	}

	public async deleteRequest(requestId: number): Promise<void> {
		const generationRequest = await this.generationRequestRepository.findOneBy({ id: requestId });

		if (!generationRequest) {
			return; // Already deleted or not found
		}

		// Check ownership
		const isOwner = this.user.userId ? generationRequest.userId === this.user.userId : generationRequest.sessionId === this.user.sessionId;
		if (!isOwner) {
			throw new ForbiddenException('Cannot delete request that does not belong to you');
		}

		await this.generationRequestRepository.delete(requestId);
	}

	public async listUserGenerations(page: number, limit: number): Promise<GenerationRequestsListDtoResponse> {
		const offset = (page - 1) * limit;

		const [items, total] = await this.generationRequestRepository.findAndCount({
			where: this.user.userId ? { userId: this.user.userId } : { sessionId: this.user.sessionId },
			relations: ['generation', 'generation.calculation'],
			order: { createdAt: 'DESC' },
			skip: offset,
			take: limit
		});

		// Truncate content to avoid loading huge data
		items.forEach((item) => {
			if (item.generation) {
				this.truncateOutput(item.generation);
			}
		});

		return GenerationRequestsListDtoResponse.fromEntities(items, total, page, limit);
	}

	public async findOrCreateGenerationRequest(calculationId: number, provider: Provider): Promise<GenerationRequestDtoResponse> {
		// 1. Найти существующую generation
		const { generation, isNew: isNewGeneration } = await this.generationsService.findOrCreateGeneration(calculationId, provider);

		// 2. Получить цену для провайдера
		const calculation = generation.calculation;
		const providerPrice = calculation.prices.find(p => p.provider === provider);

		if (!providerPrice) {
			throw new Error(`Price not found for provider ${provider}`);
		}

		// 3. Если generation завершена - просто вернуть её с generationRequest
		if (generation.status === GenerationStatus.COMPLETED) {
			const { generationRequest: existingRequest } = await this.ensureGenerationRequest(generation.id, null);
			this.truncateOutput(generation);

			existingRequest.generation = generation;
			return GenerationRequestDtoResponse.fromEntity(existingRequest);
		}

		// 4. Обработать generation request
		return await this.handleGenerationRequest(generation, calculation, providerPrice, isNewGeneration);
	}

	private async ensureGenerationRequest(
		generationId: number,
		queryRunner: QueryRunner | null
	): Promise<{ generationRequest: GenerationRequest; isNew: boolean }> {
		const whereCondition = this.user.userId ? { generationId, userId: this.user.userId } : { generationId, sessionId: this.user.sessionId };

		// Use provided queryRunner's manager or repository
		let existing: GenerationRequest | null = null;
		if (queryRunner) {
			existing = await queryRunner.manager.findOne(GenerationRequest, { where: whereCondition });
		} else {
			existing = await this.generationRequestRepository.findOneBy(whereCondition);
		}

		if (existing) {
			return { generationRequest: existing, isNew: false };
		}

		let generationRequest: GenerationRequest;
		if (queryRunner) {
			const entity = queryRunner.manager.create(GenerationRequest, {
				generationId,
				userId: this.user.userId,
				sessionId: this.user.sessionId
			});
			generationRequest = await queryRunner.manager.save(entity);
		} else {
			const entity = this.generationRequestRepository.create({
				generationId,
				userId: this.user.userId,
				sessionId: this.user.sessionId
			});
			generationRequest = await this.generationRequestRepository.save(entity);
		}

		return { generationRequest, isNew: true };
	}

	public async createPaymentLink(requestId: number): Promise<PaymentLinkDtoResponse> {
		const generationRequest = (await this.generationRequestRepository.findOne({
			where: { id: requestId },
			relations: ['generation', 'generation.calculation']
		}))!;

		// Проверка ownership
		const isOwner = this.user.userId ? generationRequest.userId === this.user.userId : generationRequest.sessionId === this.user.sessionId;
		if (!isOwner) {
			throw new ForbiddenException('Generation request does not belong to you');
		}

		// Проверить что оплата еще не прошла
		if (generationRequest.status >= PAID_THRESHOLD) {
			throw new ForbiddenException('Generation request is already paid');
		}

		const generation = generationRequest.generation;
		const calculation = generation.calculation;

		// Получить цену для провайдера
		const providerPrice = calculation.prices.find(p => p.provider === generation.provider);

		if (!providerPrice || providerPrice.price.total === 0) {
			throw new ForbiddenException('This generation does not require payment');
		}

		// Создать новую Checkout Session
		const session = await this.stripeService.createCheckoutSession({
			generationRequestId: generationRequest.id,
			amount: providerPrice.price.total,
			currency: calculation.currency,
			hostname: calculation.hostname,
			provider: generation.provider
		});

		generationRequest.paymentLink = session.url;
		await this.generationRequestRepository.save(generationRequest);

		return PaymentLinkDtoResponse.fromData(session.url);
	}

	private async queueJob(generation: Generation, generationRequest: GenerationRequest, provider: Provider): Promise<string> {
		// Проверка что оплата прошла (если требовалась)
		if (generationRequest.status < PAID_THRESHOLD) {
			throw new Error('Cannot queue job: payment required but not completed');
		}

		const message = new GenerationJobMessage(
			generation.id,
			generationRequest.id,
			generation.provider
		);

		const providerConfig = this.configService.providers[provider];
		const jobId = JobUtils.generateId(generation.id);

		await this.queueService.send(providerConfig.queueName, message, jobId);

		return jobId;
	}

	/**
	 * Truncate output to 500 chars for API responses
	 */
	private truncateOutput(generation: Generation): void {
		if (generation.output && generation.output.length > 500) {
			generation.output = generation.output.substring(0, 500) + '...';
		}
	}

	/**
	 * Обработка generation request с учетом необходимости оплаты
	 */
	private async handleGenerationRequest(generation: Generation, calculation: Calculation, providerPrice: ProviderPrices, isNewGeneration: boolean): Promise<GenerationRequestDtoResponse> {
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		this.generationsService.setQueryRunner(queryRunner);

		try {
			const { generationRequest, isNew: isNewRequest } = await this.ensureGenerationRequest(generation.id, queryRunner);

			// Если требуется оплата и еще не оплачено - вернуть GenerationRequest без создания ссылки
			if (providerPrice.price.total > 0 && generationRequest.status < PAID_THRESHOLD) {
				await queryRunner.manager.save(generation);
				await queryRunner.commitTransaction();
				this.truncateOutput(generation);
				generationRequest.generation = generation;
				return GenerationRequestDtoResponse.fromEntity(generationRequest);
			}

			// Бесплатный или уже оплачено - поставить в очередь
			// Для бесплатных запросов автоматически устанавливаем ACCEPTED
			if (providerPrice.price.total === 0 && generationRequest.status < PAID_THRESHOLD) {
				generationRequest.status = GenerationRequestStatus.ACCEPTED.value;
				await queryRunner.manager.save(generationRequest);
			}

			if (isNewGeneration || isNewRequest) {
				await this.queueJob(generation, generationRequest, generation.provider);
			}

			generation.status = GenerationStatus.WAITING;
			await queryRunner.manager.save(generation);

			await queryRunner.commitTransaction();
			this.truncateOutput(generation);
			generationRequest.generation = generation;
			return GenerationRequestDtoResponse.fromEntity(generationRequest);
		} catch (error) {
			await queryRunner.rollbackTransaction();
			throw error;
		} finally {
			await queryRunner.release();
			this.generationsService.setQueryRunner(null);
		}
	}
}

export { GenerationRequestService };
