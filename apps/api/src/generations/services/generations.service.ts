import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner, EntityManager } from 'typeorm';
import { Generation } from '../entities/generation.entity';
import { GenerationRequest } from '../entities/generation-request.entity';
import { GenerationStatus } from '../../enums/generation-status.enum';
import { QueueService } from '../../queue/queue.service';
import { GenerationJobMessage } from '../../queue/messages/generation-job.message';
import { AppConfigService, Provider } from '../../config/config.service';
import { GenerationsListDto } from '../../shared/dtos/generation.dto';

@Injectable()
class GenerationsService {
	private queryRunner: QueryRunner | null = null;

	public constructor(
		private readonly queueService: QueueService,
		private readonly configService: AppConfigService,
		private readonly dataSource: DataSource,
		@InjectRepository(Generation) private readonly generationRepository: Repository<Generation>,
		@InjectRepository(GenerationRequest) private readonly generationRequestRepository: Repository<GenerationRequest>
	) {}

	public async findById(id: number): Promise<Generation | null> {
		return this.generationRepository.findOneBy({ id });
	}

	public async delete(id: number): Promise<void> {
		await this.generationRepository.delete(id);
	}

	public async listUserGenerations(userId: number | null, sessionId: string, page: number, limit: number): Promise<GenerationsListDto> {
		const offset = (page - 1) * limit;

		const [items, total] = await this.generationRequestRepository.findAndCount({
			where: userId ? { userId } : { sessionId },
			relations: ['generation'],
			order: { requestedAt: 'DESC' },
			skip: offset,
			take: limit
		});

		return GenerationsListDto.fromEntities(items, total, page, limit);
	}

	public async findOrCreateGenerationRequest(hostname: string, provider: Provider, userId: number | null, sessionId: string): Promise<Generation> {
		// 1. Найти существующую generation (ВКЛЮЧАЯ FAILED)
		const existingGeneration = await this.manager.findOne(Generation, {
			where: { hostname, provider }
		});

		// 2. Если generation завершена - вернуть её без создания job
		// eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
		if (existingGeneration?.status === GenerationStatus.COMPLETED) {
			await this.ensureGenerationRequest(existingGeneration.id, userId, sessionId);
			return existingGeneration;
		}

		// 3-5. Транзакция: создать/обновить Generation + GenerationRequest + поставить в очередь
		this.queryRunner = this.dataSource.createQueryRunner();
		await this.queryRunner.connect();
		await this.queryRunner.startTransaction();

		try {
			// 3. Найти или создать generation (если FAILED - сбросить на WAITING)
			const { generation, isNew: isNewGeneration } = await this.ensureGeneration(hostname, provider, existingGeneration);

			// 4. Найти или создать generation request
			const { request, isNew: isNewRequest } = await this.ensureGenerationRequest(generation.id, userId, sessionId);

			// 5. Поставить в очередь если generation новая/сброшена или request новый
			if (isNewGeneration || isNewRequest) {
				await this.queueJob(generation, request, provider);
			}

			await this.queryRunner.commitTransaction();

			return generation;
		} catch (error) {
			await this.queryRunner.rollbackTransaction();
			throw error;
		} finally {
			await this.queryRunner.release();
			this.queryRunner = null;
		}
	}

	private get manager(): EntityManager {
		return this.queryRunner?.manager || this.generationRepository.manager;
	}

	private async ensureGeneration(hostname: string, provider: Provider, existing: Generation | null): Promise<{ generation: Generation; isNew: boolean }> {
		// Если generation не существует - создать новую
		if (!existing) {
			const entity = this.manager.create(Generation, {
				hostname,
				provider,
				status: GenerationStatus.WAITING
			});

			const generation = await this.manager.save(Generation, entity);
			return { generation, isNew: true };
		}

		// Если generation в статусе FAILED - сбросить на WAITING
		// eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
		if (existing.status === GenerationStatus.FAILED) {
			await this.manager.update(Generation, existing.id, {
				status: GenerationStatus.WAITING,
				errorMessage: null,
				content: null,
				entriesCount: null
			});

			existing.status = GenerationStatus.WAITING;
			existing.errorMessage = null;
			existing.content = null;
			existing.entriesCount = null;

			return { generation: existing, isNew: true };
		}

		// Иначе - вернуть существующую
		return { generation: existing, isNew: false };
	}

	private async ensureGenerationRequest(generationId: number, userId: number | null, sessionId: string): Promise<{ request: GenerationRequest; isNew: boolean }> {
		const whereCondition = userId
			? { generationId, userId }
			: { generationId, sessionId };

		const existing = await this.manager.findOne(GenerationRequest, { where: whereCondition });

		if (existing) {
			return { request: existing, isNew: false };
		}

		const entity = this.manager.create(GenerationRequest, {
			generationId,
			userId,
			sessionId
		});

		const request = await this.manager.save(GenerationRequest, entity);
		return { request, isNew: true };
	}

	private async queueJob(generation: Generation, request: GenerationRequest, provider: Provider): Promise<string> {
		const message = new GenerationJobMessage(
			generation.id,
			request.id,
			generation.hostname,
			generation.provider
		);

		const providerConfig = this.configService.providers[provider];
		const jobId = this.generateJobId(generation.id);

		await this.queueService.send(providerConfig.queueName, message, jobId);

		return jobId;
	}

	private generateJobId(generationId: number): string {
		return `genId-${generationId}`;
	}
}

export { GenerationsService };
