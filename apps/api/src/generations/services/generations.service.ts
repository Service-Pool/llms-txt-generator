import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner, EntityManager } from 'typeorm';
import { Generation } from '../entities/generation.entity';
import { GenerationStatus } from '../../shared/enums/generation-status.enum';
import { QueueService } from '../../queue/queue.service';
import { AppConfigService } from '../../config/config.service';
import { Provider } from '../../shared/enums/provider.enum';
import { JobIdUtil } from '../../shared/utils/job-id.util';
import { GenerationRequest } from '../entities/generation-request.entity';
import { CurrentUserService } from '../../common/services/current-user.service';

@Injectable()
class GenerationsService {
	private queryRunner: QueryRunner | null = null;

	public constructor(
		private readonly queueService: QueueService,
		private readonly configService: AppConfigService,
		private readonly dataSource: DataSource,
		private readonly currentUserService: CurrentUserService,
		@InjectRepository(Generation) private readonly generationRepository: Repository<Generation>,
		@InjectRepository(GenerationRequest) private readonly generationRequestRepository: Repository<GenerationRequest>
	) {}

	public async findById(id: number): Promise<Generation | null> {
		return this.generationRepository.findOneBy({ id });
	}

	public async findByIdAndUser(id: number): Promise<Generation | null> {
		const generation = await this.generationRepository.findOneBy({ id });

		if (!generation) {
			return null;
		}

		// Check if user has access through GenerationRequest
		const userId = this.currentUserService.getUserId();
		const sessionId = this.currentUserService.getSessionId();

		const hasAccess = await this.generationRequestRepository.findOne({
			where: [
				userId ? { generationId: id, userId } : {},
				sessionId ? { generationId: id, sessionId } : {}
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
	public async findOrCreateGeneration(hostname: string, provider: Provider): Promise<{ generation: Generation; isNew: boolean }> {
		// 1. Найти существующую generation (ВКЛЮЧАЯ FAILED)
		const existingGeneration = await this.manager.findOne(Generation, {
			where: { hostname, provider }
		});

		// 2. Если generation завершена - вернуть её
		if (existingGeneration?.status === GenerationStatus.COMPLETED) {
			return { generation: existingGeneration, isNew: false };
		}

		// 3. Если generation в статусе FAILED - сбросить на WAITING
		if (existingGeneration?.status === GenerationStatus.FAILED) {
			await this.manager.update(Generation, existingGeneration.id, {
				status: GenerationStatus.WAITING,
				errorMessage: null,
				content: null,
				entriesCount: null
			});

			existingGeneration.status = GenerationStatus.WAITING;
			existingGeneration.errorMessage = null;
			existingGeneration.content = null;
			existingGeneration.entriesCount = null;

			return { generation: existingGeneration, isNew: true };
		}

		// 4. Если generation не существует - создать новую
		if (!existingGeneration) {
			const entity = this.manager.create(Generation, {
				hostname,
				provider,
				status: GenerationStatus.WAITING
			});

			const generation = await this.manager.save(entity);
			return { generation, isNew: true };
		}

		// 5. Иначе - вернуть существующую как не новую
		return { generation: existingGeneration, isNew: false };
	}

	public setQueryRunner(queryRunner: QueryRunner | null): void {
		this.queryRunner = queryRunner;
	}

	public getDataSource(): DataSource {
		return this.dataSource;
	}

	private get manager(): EntityManager {
		return this.queryRunner?.manager || this.generationRepository.manager;
	}

	private generateJobId(generationId: number): string {
		return JobIdUtil.generate(generationId);
	}
}

export { GenerationsService };
