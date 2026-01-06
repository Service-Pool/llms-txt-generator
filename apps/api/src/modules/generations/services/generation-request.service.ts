import { AppConfigService } from '../../../config/config.service';
import { CalculateHostnameDtoResponse, CalculateHostnamePriceDtoResponse } from '../dto/generation-response.dto';
import { CurrentUserService } from '../../auth/services/current-user.service';
import { Generation } from '../entities/generation.entity';
import { GenerationJobMessage } from '../../queue/messages/generation-job.message';
import { GenerationRequest } from '../entities/generation-request.entity';
import { GenerationRequestsListDtoResponse } from '../dto/generation-response.dto';
import { GenerationsService } from './generations.service';
import { GenerationStatus } from '../../../enums/generation-status.enum';
import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JobUtils } from '../../../utils/job.utils';
import { PriceCalculator } from '../../../utils/price.utils';
import { Provider } from '../../../enums/provider.enum';
import { QueueService } from '../../queue/queue.service';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { RobotsService } from '../../robots/robots.service';
import { SitemapService } from '../../sitemap/sitemap.service';

@Injectable()
class GenerationRequestService {
	private readonly logger = new Logger(GenerationRequestService.name);
	private queryRunner: QueryRunner | null = null;
	private readonly userId: number | null;
	private readonly sessionId: string;

	public constructor(
		private readonly generationsService: GenerationsService,
		private readonly queueService: QueueService,
		private readonly configService: AppConfigService,
		private readonly currentUserService: CurrentUserService,
		private readonly robotsService: RobotsService,
		private readonly sitemapService: SitemapService,
		private readonly dataSource: DataSource,
		@InjectRepository(GenerationRequest) private readonly generationRequestRepository: Repository<GenerationRequest>
	) {
		this.userId = this.currentUserService.getUserId();
		this.sessionId = this.currentUserService.getSessionId();
	}

	public async deleteRequest(requestId: number): Promise<void> {
		const generationRequest = await this.generationRequestRepository.findOneBy({ id: requestId });

		if (!generationRequest) {
			return; // Already deleted or not found
		}

		// Check ownership
		const isOwner = this.userId ? generationRequest.userId === this.userId : generationRequest.sessionId === this.sessionId;
		if (!isOwner) {
			throw new ForbiddenException('Cannot delete request that does not belong to you');
		}

		await this.generationRequestRepository.delete(requestId);
	}

	public async listUserGenerations(page: number, limit: number): Promise<GenerationRequestsListDtoResponse> {
		const offset = (page - 1) * limit;

		const [items, total] = await this.generationRequestRepository.findAndCount({
			where: this.userId ? { userId: this.userId } : { sessionId: this.sessionId },
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

	public async findOrCreateGenerationRequest(hostname: string, provider: Provider): Promise<{ generation: Generation; generationRequest: GenerationRequest }> {
		// 1. Найти существующую generation
		const { generation, isNew: isNewGeneration } = await this.generationsService.findOrCreateGeneration(hostname, provider);

		// 2. Если generation завершена - просто вернуть её с generationRequest
		if (generation.status === GenerationStatus.COMPLETED) {
			const { generationRequest: existingRequest } = await this.ensureGenerationRequest(generation.id, null);
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
			const { generationRequest, isNew: isNewRequest } = await this.ensureGenerationRequest(generation.id, queryRunner);

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
		queryRunner: QueryRunner | null
	): Promise<{ generationRequest: GenerationRequest; isNew: boolean }> {
		const whereCondition = this.userId ? { generationId, userId: this.userId } : { generationId, sessionId: this.sessionId };

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
				userId: this.userId,
				sessionId: this.sessionId
			});
			generationRequest = await queryRunner.manager.save(entity);
		} else {
			const entity = this.generationRequestRepository.create({
				generationId,
				userId: this.userId,
				sessionId: this.sessionId
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
		const jobId = JobUtils.generateId(generation.id);

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

	/**
	 * Calculate price for hostname generation
	 */
	public async calculateHostname(hostname: string): Promise<CalculateHostnameDtoResponse> {
		// Get sitemap URLs from robots.txt (or fallback to /sitemap.xml)
		const sitemapUrls = await this.robotsService.getSitemaps(hostname);

		const MAX_DURATION_MS = 30000;
		const startTime = Date.now();

		let urlsCount = 0;
		let timedOut = false;

		// Count URLs with timeout
		for await (const _url of this.sitemapService.getUrlsStream(sitemapUrls)) {
			urlsCount++;

			// Check if we've exceeded the time limit
			if (Date.now() - startTime > MAX_DURATION_MS) {
				timedOut = true;
				this.logger.warn(`Analysis timed out for ${hostname} after ${MAX_DURATION_MS}ms. Counted ${urlsCount} URLs so far.`);
				break;
			}
		}

		if (!timedOut) {
			this.logger.log(`Analysis complete for ${hostname}: ${urlsCount} URLs found`);
		}

		// Calculate pricing for all providers
		const prices = Object.values(Provider).map((provider) => {
			const providerConfig = this.configService.providers[provider];
			const estimatedPrice = PriceCalculator.calculateEstimatedPrice(urlsCount, providerConfig.pricePerUrl, providerConfig.minPayment, !timedOut);

			return CalculateHostnamePriceDtoResponse.fromData(
				provider,
				estimatedPrice,
				providerConfig.priceCurrency,
				providerConfig.currencySymbol
			);
		});

		return CalculateHostnameDtoResponse.fromData(
			hostname,
			urlsCount,
			!timedOut,
			prices
		);
	}
}

export { GenerationRequestService };
