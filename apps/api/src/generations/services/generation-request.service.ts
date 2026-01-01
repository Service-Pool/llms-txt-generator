import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { GenerationRequest } from '../entities/generation-request.entity';
import { Generation } from '../entities/generation.entity';
import { GenerationStatus } from '../../shared/enums/generation-status.enum';
import { QueueService } from '../../queue/queue.service';
import { GenerationJobMessage } from '../../queue/messages/generation-job.message';
import { AppConfigService } from '../../config/config.service';
import { Provider } from '../../shared/enums/provider.enum';
import { GenerationRequestsListDtoResponse } from '../../shared/dtos/generation-response.dto';
import { JobIdUtil } from '../../shared/utils/job-id.util';
import { GenerationsService } from './generations.service';

@Injectable()
class GenerationRequestService {
	private queryRunner: QueryRunner | null = null;

	public constructor(
		private readonly generationsService: GenerationsService,
		private readonly queueService: QueueService,
		private readonly configService: AppConfigService,
		private readonly dataSource: DataSource,
		@InjectRepository(GenerationRequest) private readonly generationRequestRepository: Repository<GenerationRequest>
	) {}

	public async deleteRequest(requestId: number, userId: number | null, sessionId: string): Promise<void> {
		const generationRequest = await this.generationRequestRepository.findOneBy({ id: requestId });

		if (!generationRequest) {
			return; // Already deleted or not found
		}

		// Check ownership
		const isOwner = userId ? generationRequest.userId === userId : generationRequest.sessionId === sessionId;
		if (!isOwner) {
			throw new ForbiddenException('Cannot delete request that does not belong to you');
		}

		await this.generationRequestRepository.delete(requestId);
	}

	public async listUserGenerations(userId: number | null, sessionId: string, page: number, limit: number): Promise<GenerationRequestsListDtoResponse> {
		const offset = (page - 1) * limit;

		const [items, total] = await this.generationRequestRepository.findAndCount({
			where: userId ? { userId } : { sessionId },
			relations: ['generation'],
			order: { requestedAt: 'DESC' },
			skip: offset,
			take: limit
		});

		// Truncate content to avoid loading huge data
		items.forEach((item) => {
			if (item.generation) {
				this.truncateContent(item.generation);
			}
		});

		return GenerationRequestsListDtoResponse.fromEntities(items, total, page, limit);
	}

	public async findOrCreateGenerationRequest(hostname: string, provider: Provider, userId: number | null, sessionId: string): Promise<{ generation: Generation; generationRequest: GenerationRequest }> {
		// 1. Найти существующую generation
		const { generation, isNew: isNewGeneration } = await this.generationsService.findOrCreateGeneration(hostname, provider);

		// 2. Если generation завершена - просто вернуть её с generationRequest
		if (generation.status === GenerationStatus.COMPLETED) {
			const { generationRequest: existingRequest } = await this.ensureGenerationRequest(generation.id, userId, sessionId, null);
			this.truncateContent(generation);

			return { generation, generationRequest: existingRequest };
		}

		// 3-5. Транзакция: создать GenerationRequest + поставить в очередь
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		this.queryRunner = queryRunner;
		this.generationsService.setQueryRunner(queryRunner);

		try {
			// 4. Найти или создать generation request
			const { generationRequest, isNew: isNewRequest } = await this.ensureGenerationRequest(generation.id, userId, sessionId, queryRunner);

			// 5. Поставить в очередь если generation новая или generationRequest новый
			if (isNewGeneration || isNewRequest) {
				await this.queueJob(generation, generationRequest, provider);
			}

			await queryRunner.commitTransaction();

			this.truncateContent(generation);
			return { generation, generationRequest };
		} catch (error) {
			await queryRunner.rollbackTransaction();
			throw error;
		} finally {
			await queryRunner.release();
			this.queryRunner = null;
			this.generationsService.setQueryRunner(null);
		}
	}

	private async ensureGenerationRequest(
		generationId: number,
		userId: number | null,
		sessionId: string,
		queryRunner: QueryRunner | null
	): Promise<{ generationRequest: GenerationRequest; isNew: boolean }> {
		const whereCondition = userId ? { generationId, userId } : { generationId, sessionId };

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
				userId,
				sessionId
			});
			generationRequest = await queryRunner.manager.save(entity);
		} else {
			const entity = this.generationRequestRepository.create({
				generationId,
				userId,
				sessionId
			});
			generationRequest = await this.generationRequestRepository.save(entity);
		}

		return { generationRequest, isNew: true };
	}

	private async queueJob(generation: Generation, generationRequest: GenerationRequest, provider: Provider): Promise<string> {
		const message = new GenerationJobMessage(
			generation.id,
			generationRequest.id,
			generation.hostname,
			generation.provider
		);

		const providerConfig = this.configService.providers[provider];
		const jobId = JobIdUtil.generate(generation.id);

		await this.queueService.send(providerConfig.queueName, message, jobId);

		return jobId;
	}

	/**
	 * Truncate content to 500 chars for API responses
	 */
	private truncateContent(generation: Generation): void {
		if (generation.content && generation.content.length > 500) {
			generation.content = generation.content.substring(0, 500) + '...';
		}
	}
}

export { GenerationRequestService };
