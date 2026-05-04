import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '@/config/config.service';
import { AiModelsConfigService } from '@/modules/ai-models/services/ai-models-config.service';
import { AimdQueue, LLM_TIMEOUT_MS } from './aimd-queue';
import { FixedQueue } from './fixed-queue';

@Injectable()
class RequestQueueService {
	private readonly logger = new Logger(RequestQueueService.name);
	private readonly llmQueues = new Map<string, AimdQueue>();
	private readonly embedQueues = new Map<string, AimdQueue>();
	private readonly crawlQueue: FixedQueue;

	constructor(
		private readonly appConfig: AppConfigService,
		private readonly aiModels: AiModelsConfigService
	) {
		this.crawlQueue = new FixedQueue({
			concurrency: this.appConfig.crawlConcurrency
		});
	}

	async llm<T>(modelId: string, fn: () => Promise<T>): Promise<T> {
		return this.getLlmQueue(modelId).submit(fn);
	}

	async embed<T>(modelId: string, fn: () => Promise<T>): Promise<T> {
		return this.getEmbedQueue(modelId).submit(fn);
	}

	async crawl<T>(fn: () => Promise<T>): Promise<T> {
		return this.crawlQueue.submit(fn);
	}

	private getLlmQueue(modelId: string): AimdQueue {
		if (!this.llmQueues.has(modelId)) {
			const config = this.aiModels.getModelById(modelId);
			if (!config) throw new Error(`RequestQueueService: unknown modelId "${modelId}"`);
			this.llmQueues.set(modelId, new AimdQueue({
				maxConcurrency: config.options.maxLlmConcurrency,
				timeoutMs: LLM_TIMEOUT_MS,
				label: `llm:${modelId}`,
				logger: this.logger
			}));
		}
		return this.llmQueues.get(modelId);
	}

	private getEmbedQueue(modelId: string): AimdQueue {
		if (!this.embedQueues.has(modelId)) {
			const config = this.aiModels.getModelById(modelId);
			if (!config) throw new Error(`RequestQueueService: unknown modelId "${modelId}"`);
			this.embedQueues.set(modelId, new AimdQueue({
				maxConcurrency: null,
				timeoutMs: LLM_TIMEOUT_MS,
				label: `embed:${modelId}`,
				logger: this.logger
			}));
		}
		return this.embedQueues.get(modelId);
	}
}

export { RequestQueueService };
