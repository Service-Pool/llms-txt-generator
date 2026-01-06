import { AnalyzeHostnameDtoResponse, AnalyzeHostnamePriceDtoResponse } from './dto/stats-response.dto';
import { Injectable, Logger } from '@nestjs/common';
import { RobotsService } from '../../modules/robots/robots.service';
import { SitemapService } from '../../modules/sitemap/sitemap.service';
import { AppConfigService } from '../../config/config.service';
import { Provider } from '../../enums/provider.enum';
import { PriceCalculator } from '../../utils/price.utils';

@Injectable()
class StatsService {
	private readonly logger = new Logger(StatsService.name);

	public constructor(
		private readonly robotsService: RobotsService,
		private readonly sitemapService: SitemapService,
		private readonly configService: AppConfigService
	) { }

	public async analyzeHostname(hostname: string): Promise<AnalyzeHostnameDtoResponse> {
		// Get sitemap URLs from robots.txt (or fallback to /sitemap.xml)
		const sitemapUrls = await this.robotsService.getSitemaps(hostname);

		const MAX_DURATION_MS = 30000; // 40 seconds
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

			return AnalyzeHostnamePriceDtoResponse.fromData(
				provider,
				estimatedPrice,
				providerConfig.priceCurrency,
				providerConfig.currencySymbol
			);
		});

		return AnalyzeHostnameDtoResponse.fromData(
			hostname,
			urlsCount,
			!timedOut,
			prices
		);
	}
}

export { StatsService };
