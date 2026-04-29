import { Logger } from '@nestjs/common';
import { ContentExtractionService } from '@/modules/content/services/content-extraction.service';
import { AdaptiveLimit } from '@/utils/adaptive-limit';

interface FetchedPage {
	title: string;
	content: string;
}

abstract class PageProcessorBase {
	protected abstract readonly logger: Logger;
	protected static readonly FETCH_MAX_ATTEMPTS = 5;

	constructor(protected readonly contentExtractionService: ContentExtractionService) { }

	protected async fetchContent(url: string, crawlLimit: AdaptiveLimit, attempt = 1): Promise<FetchedPage> {
		const maxAttempts = PageProcessorBase.FETCH_MAX_ATTEMPTS;
		try {
			const { title, content } = await this.contentExtractionService.extractContent(url);
			return { title, content };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			const isRetryable = message.includes('HTTP 429') || message.includes('HTTP 503') || message.includes('timeout');

			if (isRetryable && attempt < maxAttempts) {
				crawlLimit.onError();
				const delayMs = Math.min(1000 * 2 ** (attempt - 1), 30000);
				this.logger.warn(`Retry ${attempt}/${maxAttempts - 1} for ${url} in ${delayMs}ms: ${message}`);
				await new Promise(resolve => setTimeout(resolve, delayMs));
				return this.fetchContent(url, crawlLimit, attempt + 1);
			}

			this.logger.warn(`Failed to fetch ${url} after ${attempt} attempt(s): ${message}`);
			throw error;
		}
	}

	public buildHashKey(modelId: string, hostnameOrUrl: string): string {
		const { hostname } = this.parseUrl(hostnameOrUrl);
		return `summary:${modelId}:${hostname}`;
	}

	protected parseUrl(url: string): { hostname: string; path: string } {
		const urlObj = new URL(url);
		return { hostname: urlObj.hostname, path: urlObj.pathname };
	}
}

export { PageProcessorBase };
export type { FetchedPage };
