import { HttpService } from '../http/http.module';
import { Injectable, Logger } from '@nestjs/common';
import robotsParser from 'robots-parser';
/**
 * Robots.txt service
 * Handles fetching and parsing robots.txt files to extract sitemap URLs
 */
@Injectable()
export class RobotsService {
	private readonly logger = new Logger(RobotsService.name);

	public constructor(private readonly httpService: HttpService) {}

	/**
	 * Get sitemap URLs from robots.txt
	 * Falls back to /sitemap.xml if robots.txt is not available or contains no sitemaps
	 */
	public async getSitemaps(hostname: string): Promise<string[]> {
		try {
			const robotsUrl = `${hostname}/robots.txt`;
			const response = await this.httpService.axios.get<string>(robotsUrl, {
				responseType: 'text'
			});

			const robotsTxt = response.data;
			const robots = robotsParser(robotsUrl, robotsTxt);

			// Получаем sitemaps через библиотеку
			const sitemaps = robots.getSitemaps();

			// Если в robots.txt нет sitemap, используем стандартный
			if (!sitemaps || sitemaps.length === 0) {
				this.logger.warn(`No sitemaps found in robots.txt for ${hostname}, using default`);
				return [`${hostname}/sitemap.xml`];
			}

			this.logger.log(`Found ${sitemaps.length} sitemaps for ${hostname}`);
			return sitemaps;
		} catch (error) {
			this.logger.error(`Error fetching robots.txt from ${hostname}:`, error);
			return [`${hostname}/sitemap.xml`];
		}
	}
}
