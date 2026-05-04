import { Logger } from '@nestjs/common';
import { ContentExtractionService } from '@/modules/content/services/content-extraction.service';

interface FetchedPage {
	title: string;
	content: string;
}

abstract class PageProcessorBase {
	protected abstract readonly logger: Logger;

	constructor(protected readonly contentExtractionService: ContentExtractionService) { }

	protected async fetchContent(url: string): Promise<FetchedPage> {
		const { title, content } = await this.contentExtractionService.extractContent(url);
		return { title, content };
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
