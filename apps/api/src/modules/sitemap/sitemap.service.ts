import { Injectable, Logger } from '@nestjs/common';
import Sitemapper from 'sitemapper';

/**
 * Sitemap service
 * Handles fetching and parsing XML sitemaps to extract page URLs
 */
@Injectable()
export class SitemapService {
	private readonly logger = new Logger(SitemapService.name);
	private readonly sitemapper = new Sitemapper({
		timeout: 5000, // 5 секунд
		retries: 3
	});

	/**
	 * Stream URLs from multiple sitemaps
	 * Yields unique URLs one by one without loading all into memory
	 */
	public async* getUrlsStream(sitemapUrls: string[]): AsyncGenerator<string> {
		const seenUrls = new Set<string>();

		for (const sitemapUrl of sitemapUrls) {
			try {
				this.logger.log(`Fetching sitemap: ${sitemapUrl}`);
				const { sites } = await this.sitemapper.fetch(sitemapUrl);

				for (const url of sites) {
					// Yield только уникальные URLs
					if (!seenUrls.has(url)) {
						seenUrls.add(url);
						yield url;
					}
				}
			} catch (error) {
				this.logger.error(`Error fetching sitemap ${sitemapUrl}:`, error instanceof Error ? error.message : String(error));
			}
		}
	}
}
