import { ClsService } from 'nestjs-cls';
import { Generation } from '../entities/generation.entity';
import { GenerationRequest } from '../entities/generation-request.entity';
import { GenerationStatus } from '../../../enums/generation-status.enum';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JobUtils } from '../../../utils/job.utils';
import { Provider } from '../../../enums/provider.enum';
import { QueueService } from '../../queue/queue.service';
import { Repository, DataSource, QueryRunner, EntityManager } from 'typeorm';
import { type UserClsStore } from '../../auth/models/user-context.model';

@Injectable()
class GenerationsService {
	private queryRunner: QueryRunner | null = null;

	public constructor(
		private readonly queueService: QueueService,
		private readonly dataSource: DataSource,
		private readonly cls: ClsService<UserClsStore>,
		@InjectRepository(Generation) private readonly generationRepository: Repository<Generation>,
		@InjectRepository(GenerationRequest) private readonly generationRequestRepository: Repository<GenerationRequest>
	) { }

	public async findById(id: number): Promise<Generation | null> {
		return this.generationRepository.findOne({
			where: { id },
			relations: ['calculation']
		});
	}

	public async findByIdAndUser(id: number): Promise<Generation | null> {
		const generation = await this.generationRepository.findOne({
			where: { id },
			relations: ['calculation']
		});

		if (!generation) {
			return null;
		}

		const userId = this.cls.get('userId');
		const sessionId = this.cls.get('sessionId');

		// Check if user has access through GenerationRequest
		const hasAccess = await this.generationRequestRepository.findOne({
			where: [
				userId ? { generationId: id, userId } : {},
				{ generationId: id, sessionId }
			]
		});

		return hasAccess ? generation : null;
	}

	public async delete(id: number): Promise<void> {
		const jobId = this.generateJobId(id);
		await this.generationRepository.delete(id);
		await this.queueService.remove(jobId);
	}

	/**
	 * Найти существующую generation или создать новую
	 * Если generation в статусе FAILED - сбросить на WAITING
	 */
	public async findOrCreateGeneration(calculationId: number, provider: Provider): Promise<{ generation: Generation; isNew: boolean }> {
		// 1. Найти существующую generation (ВКЛЮЧАЯ FAILED)
		const existingGeneration = await this.manager.findOne(Generation, {
			where: { calculationId, provider },
			relations: ['calculation']
		});

		// 2. Если generation завершена - вернуть её
		if (existingGeneration?.status === GenerationStatus.COMPLETED) {
			return { generation: existingGeneration, isNew: false };
		}

		// 3. Если generation в статусе FAILED - сбросить на WAITING
		if (existingGeneration?.status === GenerationStatus.FAILED) {
			await this.manager.update(Generation, existingGeneration.id, {
				status: GenerationStatus.WAITING,
				errors: null,
				output: null,
				llmsEntriesCount: null
			});

			existingGeneration.status = GenerationStatus.WAITING;
			existingGeneration.errors = null;
			existingGeneration.output = null;
			existingGeneration.llmsEntriesCount = null;

			return { generation: existingGeneration, isNew: true };
		}

		// 4. Если generation не существует - создать новую
		if (!existingGeneration) {
			const entity = this.manager.create(Generation, {
				calculationId,
				provider,
				status: GenerationStatus.WAITING
			});

			const generation = await this.manager.save(entity);

			// Загрузить calculation relation
			const newGeneration = await this.manager.findOne(Generation, {
				where: { id: generation.id },
				relations: ['calculation']
			});

			return { generation: newGeneration!, isNew: true };
		}

		// 5. Иначе - вернуть существующую как не новую
		return { generation: existingGeneration, isNew: false };
	}

	public setQueryRunner(queryRunner: QueryRunner | null): void {
		this.queryRunner = queryRunner;
	}

	public async updateGenerationStatus(id: number, status: GenerationStatus): Promise<void> {
		await this.manager.update(Generation, id, { status });
	}

	public getDataSource(): DataSource {
		return this.dataSource;
	}

	private get manager(): EntityManager {
		return this.queryRunner?.manager || this.generationRepository.manager;
	}

	private generateJobId(generationId: number): string {
		return JobUtils.generateId(generationId);
	}
}

export { GenerationsService };
