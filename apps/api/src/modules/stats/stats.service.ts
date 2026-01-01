import { AnalyzeHostnameDtoResponse } from './dto/stats-response.dto';
import { Injectable, Logger } from '@nestjs/common';
import { RobotsService } from '../../modules/robots/robots.service';
import { SitemapService } from '../../modules/sitemap/sitemap.service';

@Injectable()
class StatsService {
	private readonly logger = new Logger(StatsService.name);

	public constructor(
		private readonly robotsService: RobotsService,
		private readonly sitemapService: SitemapService
	) {}

	public async analyzeHostname(hostname: string): Promise<AnalyzeHostnameDtoResponse> {
		// Get sitemap URLs from robots.txt (or fallback to /sitemap.xml)
		const sitemapUrls = await this.robotsService.getSitemaps(hostname);

		const MAX_DURATION_MS = 10000; // 10 seconds
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

		return AnalyzeHostnameDtoResponse.fromData(hostname, urlsCount, !timedOut);
	}
}

export { StatsService };
