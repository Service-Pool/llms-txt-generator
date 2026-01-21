import { AiServiceInterface } from '../../generations/services/llm/ai-service.interface';
import { AppConfigService } from '../../../config/config.service';
import { ContentExtractorService } from '../../generations/services/content-extractor.service';
import { GeminiService } from '../../generations/services/llm/gemini.service';
import { Generation } from '../../generations/entities/generation.entity';
import { GenerationJobMessage } from '../messages/generation-job.message';
import { GenerationStatus } from '../../../enums/generation-status.enum';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { OllamaService } from '../../generations/services/llm/ollama.service';
import { Provider } from '../../../enums/provider.enum';
import { Redis } from 'ioredis';
import { Repository } from 'typeorm';
import { RobotsService } from '../../robots/robots.service';
import { SitemapService } from '../../sitemap/sitemap.service';
import { UrlSummary } from '../../generations/models/url-summary';
import { UrlSummaryBatch } from '../../generations/models/url-summary-batch';

/**
 * Generation job handler
 * Handles llms.txt generation jobs
 */
@Injectable()
export class GenerationJobHandler {
	private readonly logger = new Logger(GenerationJobHandler.name);
	private readonly redis: Redis;
	private readonly cacheTtl: number;
	private readonly CRITICAL_FAILURE_THRESHOLD = 0.8;
	private context: {
		job: Job<GenerationJobMessage>;
		generationId: number;
		totalUrls: number;
		provider: Provider;
		hostname: string;
		cleanHostname: string;
		llmService: AiServiceInterface;
		batchSize: number;
	} | null = null;

	private get ctx() {
		if (!this.context) {
			throw new Error('Context is not initialized');
		}
		return this.context;
	}

	public constructor(
		private readonly configService: AppConfigService,
		private readonly robotsService: RobotsService,
		private readonly sitemapService: SitemapService,
		private readonly contentExtractor: ContentExtractorService,
		private readonly ollamaService: OllamaService,
		private readonly geminiService: GeminiService,
		@InjectRepository(Generation) private readonly generationRepository: Repository<Generation>
	) {
		this.redis = new Redis({
			host: configService.redis.host,
			port: configService.redis.port
		});
		this.cacheTtl = configService.cache.summaryCacheTtl;
	}

	public async handle(job: Job<GenerationJobMessage>): Promise<void> {
		const { generationId, provider } = job.data;

		// Загрузить Generation с Calculation для получения hostname
		const generation = await this.generationRepository.findOne({
			where: { id: generationId },
			relations: ['calculation']
		});

		if (!generation) {
			throw new Error(`Generation ${generationId} not found`);
		}

		if (!generation.calculation) {
			throw new Error(`Generation ${generationId} has no calculation`);
		}

		const hostname = generation.calculation.hostname;

		await this.generationRepository.update(generationId, {
			status: GenerationStatus.ACTIVE,
			errors: null
		});

		try {
			const sitemapUrls = await this.robotsService.getSitemaps(hostname);
			const totalUrls = await this.countTotalUrls(sitemapUrls);

			// Set context for the job
			this.context = {
				job,
				generationId,
				totalUrls,
				provider,
				hostname,
				cleanHostname: this.cleanHostname(hostname),
				llmService: this.getLlmService(provider),
				batchSize: this.configService.providers[provider].batchSize
			};

			const allSummaries = await this.processUrlsInBatches(sitemapUrls);
			const websiteDescription = await this.getWebsiteDescription(allSummaries);

			await this.completeGeneration(websiteDescription, allSummaries, job.id);
		} catch (error) {
			await this.handleJobError(job, error);
			throw error;
		} finally {
			this.context = null;
		}
	}

	private async processUrlsInBatches(sitemapUrls: string[]): Promise<UrlSummary[]> {
		const allSummaries: UrlSummary[] = [];
		let batchItems: UrlSummary[] = [];

		this.logger.log(`Processing a job with batch size: ${this.ctx.batchSize}`);

		const urls = this.sitemapService.getUrlsStream(sitemapUrls);

		for await (const url of urls) {
			batchItems.push(new UrlSummary(url, this.contentExtractor));

			if (batchItems.length >= this.ctx.batchSize) {
				const batch = new UrlSummaryBatch(batchItems, this.redis);
				this.logger.log(`Processing batch of ${batch.size} URLs`);

				await this.processBatch(batch);
				allSummaries.push(...batch.getItems());

				// Update job progress (will be picked up by BullMQ worker)
				await this.ctx.job.updateProgress({
					processedUrls: allSummaries.length,
					totalUrls: this.ctx.totalUrls
				});

				batchItems = [];
			}
		}

		if (batchItems.length > 0) {
			const batch = new UrlSummaryBatch(batchItems, this.redis);
			this.logger.log(`Processing final batch of ${batch.size} URLs`);

			await this.processBatch(batch);
			allSummaries.push(...batch.getItems());

			// Update final progress
			await this.ctx.job.updateProgress({
				processedUrls: allSummaries.length,
				totalUrls: this.ctx.totalUrls
			});
		}

		return allSummaries;
	}

	private async processBatch(batch: UrlSummaryBatch): Promise<void> {
		const cacheKey = `summary:${this.ctx.provider}:${this.ctx.cleanHostname}`;
		await batch.loadSummaries(this.ctx.llmService, cacheKey, this.cacheTtl);
	}

	private async getWebsiteDescription(summaries: UrlSummary[]): Promise<string> {
		const cacheKey = `summary:${this.ctx.provider}:${this.ctx.cleanHostname}`;
		const cachedDescription = await this.redis.hget(cacheKey, '__webDescription__');

		if (cachedDescription) {
			this.logger.log('Using cached website description');
			return cachedDescription;
		}

		this.logger.log(`Generating website description from ${summaries.length} summaries`);
		const websiteDescription = await this.ctx.llmService.generateWebsiteDescription(summaries);
		this.logger.log(`Generated website description: ${websiteDescription.substring(0, 100)}...`);

		await this.redis.hset(cacheKey, '__webDescription__', websiteDescription);
		await this.redis.expire(cacheKey, this.cacheTtl);

		return websiteDescription;
	}

	private async completeGeneration(websiteDescription: string, summaries: UrlSummary[], jobId: string | undefined): Promise<void> {
		// Проверить сколько успешных summaries
		const validSummaries = summaries.filter(s => s.isValid);
		const failedSummaries = summaries.filter(s => !s.isValid);

		// Если все или большинство (>80%) упали - это критическая ошибка
		const failureRate = failedSummaries.length / summaries.length;

		if (failureRate >= this.CRITICAL_FAILURE_THRESHOLD) {
			const uniqueErrors = [...new Set(failedSummaries.map(s => s.error).filter(Boolean))];
			throw new Error(`Critical failure: ${failedSummaries.length}/${summaries.length} pages failed to generate. Errors: ${uniqueErrors.join(', ')}`);
		}

		const llmsTxt = this.formatLlmsTxt(this.ctx.hostname, websiteDescription, summaries);

		await this.generationRepository.update(this.ctx.generationId, {
			status: GenerationStatus.COMPLETED,
			output: llmsTxt,
			llmsEntriesCount: summaries.length,
			errors: null
		});

		this.logger.log(`Completed job ${jobId} for generation ${this.ctx.generationId} (${validSummaries.length}/${summaries.length} valid summaries)`);
	}

	private async handleJobError(job: Job, error: unknown): Promise<void> {
		this.logger.error(`Failed job ${job.id} for generation ${this.ctx.generationId}:`, error);

		const maxAttempts = this.configService.queue.retryLimit + 1;
		const currentAttempt = job.attemptsStarted;

		this.logger.warn(`Job attempt ${currentAttempt}/${maxAttempts} (made: ${job.attemptsMade}, started: ${job.attemptsStarted})`);

		const isLastAttempt = currentAttempt >= maxAttempts;

		if (isLastAttempt) {
			this.logger.error(`Final attempt failed, marking generation ${this.ctx.generationId} as FAILED`);
			const errors = error instanceof Error ? error.message : String(error);

			await this.generationRepository.update(this.ctx.generationId, {
				status: GenerationStatus.FAILED,
				errors
			});
		} else {
			this.logger.warn(`Will retry (${maxAttempts - currentAttempt} attempts remaining)`);
			await this.generationRepository.update(this.ctx.generationId, {
				errors: error instanceof Error ? error.message : String(error)
			});
		}
	}

	private cleanHostname(hostname: string): string {
		return hostname.replace(/^https?:\/\//, '').replace(/\/$/, '');
	}

	private async countTotalUrls(sitemapUrls: string[]): Promise<number> {
		let totalUrls = 0;

		for await (const _url of this.sitemapService.getUrlsStream(sitemapUrls)) {
			totalUrls++;
		}
		this.logger.log(`Total URLs found: ${totalUrls}`);

		return totalUrls;
	}

	private getLlmService(provider: Provider): AiServiceInterface {
		switch (provider) {
			case Provider.OLLAMA:
				return this.ollamaService;
			case Provider.GEMINI:
				return this.geminiService;
			default:
				throw new Error(`Unknown provider: ${provider as string}`);
		}
	}

	/**
	 * Format entries into llms.txt standard format
	 * See: https://llmstxt.org/
	 */
	private formatLlmsTxt(hostname: string, description: string, summaries: UrlSummary[]): string {
		// Извлечь название сайта из hostname
		const siteName = hostname.replace(/^https?:\/\//, '').replace(/^www\./, '');

		// Заголовок
		let output = `# ${siteName}\n\n`;

		// Описание сайта
		output += `> ${description}\n\n`;

		// Страницы
		for (const summary of summaries) {
			const entry = summary.toEntry();
			output += `- [${entry.title}](${entry.url}): ${entry.summary}\n`;
		}

		return output;
	}
}
