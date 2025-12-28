import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { Redis } from 'ioredis';
import { GenerationJobMessage } from '../messages/generation-job.message';
import { Generation } from '../../generations/entities/generation.entity';
import { GenerationStatus } from '../../enums/generation-status.enum';
import { AppConfigService, Provider } from '../../config/config.service';
import { RobotsService } from '../../generations/services/robots.service';
import { SitemapService } from '../../generations/services/sitemap.service';
import { ContentExtractorService } from '../../generations/services/content-extractor.service';
import { AiServiceInterface } from '../../generations/services/llm/ai-service.interface';
import { OllamaService } from '../../generations/services/llm/ollama.service';
import { GeminiService } from '../../generations/services/llm/gemini.service';
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
		const { generationId, hostname, provider } = job.data;

		await this.generationRepository.update(generationId, { status: GenerationStatus.ACTIVE });

		try {
			const sitemapUrls = await this.robotsService.getSitemaps(hostname);
			const llmService = this.getLlmService(provider);
			const batchSize = this.configService.providers[provider].batchSize;
			const cleanHostname = this.cleanHostname(hostname);

			await this.countTotalUrls(sitemapUrls);

			const allSummaries = await this.processUrlsInBatches(sitemapUrls, llmService, provider, cleanHostname, batchSize);
			const websiteDescription = await this.getWebsiteDescription(llmService, allSummaries, provider, cleanHostname);

			await this.completeGeneration(generationId, hostname, websiteDescription, allSummaries, job.id);
		} catch (error) {
			await this.handleJobError(generationId, job, error);
			throw error;
		}
	}

	private cleanHostname(hostname: string): string {
		return hostname.replace(/^https?:\/\//, '').replace(/\/$/, '');
	}

	private async countTotalUrls(sitemapUrls: string[]): Promise<void> {
		let totalUrls = 0;
		for await (const _url of this.sitemapService.getUrlsStream(sitemapUrls)) {
			totalUrls++;
		}
		this.logger.log(`Total URLs found: ${totalUrls}`);
	}

	private async processUrlsInBatches(sitemapUrls: string[], llmService: AiServiceInterface, provider: Provider, cleanHostname: string, batchSize: number): Promise<UrlSummary[]> {
		const allSummaries: UrlSummary[] = [];
		let batchItems: UrlSummary[] = [];

		this.logger.log(`Processing a job with batch size: ${batchSize}`);

		const urls = this.sitemapService.getUrlsStream(sitemapUrls);

		for await (const url of urls) {
			batchItems.push(new UrlSummary(url, this.contentExtractor));

			if (batchItems.length >= batchSize) {
				const batch = new UrlSummaryBatch(batchItems, this.redis);
				this.logger.log(`Processing batch of ${batch.size} URLs`);

				await this.processBatch(batch, llmService, provider, cleanHostname);
				allSummaries.push(...batch.getItems());

				batchItems = [];
			}
		}

		if (batchItems.length > 0) {
			const batch = new UrlSummaryBatch(batchItems, this.redis);
			this.logger.log(`Processing final batch of ${batch.size} URLs`);

			await this.processBatch(batch, llmService, provider, cleanHostname);
			allSummaries.push(...batch.getItems());
		}

		return allSummaries;
	}

	private async getWebsiteDescription(llmService: AiServiceInterface, summaries: UrlSummary[], provider: Provider, cleanHostname: string): Promise<string> {
		const cacheKey = `summary:${provider}:${cleanHostname}`;
		const cachedDescription = await this.redis.hget(cacheKey, '__webDescription__');

		if (cachedDescription) {
			this.logger.log('Using cached website description');
			return cachedDescription;
		}

		this.logger.log(`Generating website description from ${summaries.length} summaries`);
		const websiteDescription = await llmService.generateWebsiteDescription(summaries);
		this.logger.log(`Generated website description: ${websiteDescription.substring(0, 100)}...`);

		await this.redis.hset(cacheKey, '__webDescription__', websiteDescription);
		await this.redis.expire(cacheKey, this.cacheTtl);

		return websiteDescription;
	}

	private async completeGeneration(generationId: number, hostname: string, websiteDescription: string, summaries: UrlSummary[], jobId: string | undefined): Promise<void> {
		const llmsTxt = this.formatLlmsTxt(hostname, websiteDescription, summaries);

		await this.generationRepository.update(generationId, {
			status: GenerationStatus.COMPLETED,
			content: llmsTxt,
			entriesCount: summaries.length
		});

		this.logger.log(`Completed job ${jobId} for generation ${generationId}`);
	}

	private async handleJobError(generationId: number, job: Job, error: unknown): Promise<void> {
		this.logger.error(`Failed job ${job.id} for generation ${generationId}:`, error);

		const maxAttempts = this.configService.queue.retryLimit + 1;
		const currentAttempt = job.attemptsStarted;

		this.logger.warn(`Job attempt ${currentAttempt}/${maxAttempts} (made: ${job.attemptsMade}, started: ${job.attemptsStarted})`);

		const isLastAttempt = currentAttempt >= maxAttempts;

		if (isLastAttempt) {
			this.logger.error(`Final attempt failed, marking generation ${generationId} as FAILED`);
			await this.generationRepository.update(generationId, {
				status: GenerationStatus.FAILED,
				errorMessage: error instanceof Error ? error.message : String(error)
			});
		} else {
			this.logger.warn(`Will retry (${maxAttempts - currentAttempt} attempts remaining)`);
			await this.generationRepository.update(generationId, {
				errorMessage: error instanceof Error ? error.message : String(error)
			});
		}
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

	private async processBatch(batch: UrlSummaryBatch, llmService: AiServiceInterface, provider: Provider, hostname: string): Promise<void> {
		const cacheKey = `summary:${provider}:${hostname}`;
		await batch.loadSummaries(llmService, cacheKey, this.cacheTtl);
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
