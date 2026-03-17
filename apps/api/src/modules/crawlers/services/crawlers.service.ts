import { Injectable, Logger } from '@nestjs/common';
import { RequestUtils } from '@/utils/request/fetch';
import robotsParser from 'robots-parser';
import { SitemapParserService } from './sitemap-parser.service';

@Injectable()
class CrawlersService {
	private readonly FETCH_TIMEOUT = 2000;

	private readonly logger = new Logger(CrawlersService.name);

	constructor(private readonly sitemapParser: SitemapParserService) { }

	/**
	 * Валидатор: существует ли robots.txt и доступен ли он.
	 */
	public async checkRobotsTxt(hostname: string): Promise<boolean> {
		const url = this.normalizeUrl(hostname, 'robots.txt');
		return await RequestUtils.exists(url);
	}

	/**
	 * Валидатор: существует ли хотя бы один рабочий sitemap.
	 */
	public async checkSitemapXml(hostname: string): Promise<boolean> {
		const locations = await this.getSitemapLocations(hostname);
		const results = await Promise.all(locations.map(url => RequestUtils.exists(url)));
		return results.some(exists => exists);
	}

	/**
	 * Получает канонический hostname, следуя редиректам.
	 * Например, shopify.com → www.shopify.com
	 */
	public async getCanonicalHostname(hostname: string): Promise<string> {
		const url = this.normalizeUrl(hostname, '');

		try {
			const response = await RequestUtils.trace(url, 5000, { method: 'HEAD' });

			// response.url содержит финальный URL после всех редиректов
			if (response.url && response.url !== url) {
				const canonicalUrl = new URL(response.url);
				const canonical = `${canonicalUrl.protocol}//${canonicalUrl.host}`;
				this.logger.log(`Canonical hostname resolved: ${hostname} → ${canonical}`);
				return canonical;
			}
		} catch (error) {
			this.logger.warn(`Failed to resolve canonical hostname for ${hostname}, using original:`, error);
		}

		return this.normalizeUrl(hostname, '').replace(/\/$/, '');
	}

	/**
	 * Парсит все найденные сайтмепы и возвращает плоский список уникальных валидных URL.
	 */
	public async getAllSitemapUrls(hostname: string): Promise<string[]> {
		const locations = await this.getSitemapLocations(hostname);

		try {
			// Запускаем парсинг всех sitemap параллельно
			const results = await Promise.all(locations.map(async (url) => {
				try {
					this.logger.log(`Parsing sitemap: ${url}`);
					return await this.sitemapParser.parseUrls(url);
				} catch (error) {
					this.logger.warn(`Failed to parse sitemap at ${url}:`, error);
					return [];
				}
			}));

			// Собираем все URL в один массив
			return results.flat();
		} catch (error) {
			this.logger.warn(`No accessible sitemap found for ${hostname}`, error);
			return [];
		}
	}

	/**
	 * Получает содержимое robots.txt как строку.
	 */
	private async getRobotsTxt(hostname: string): Promise<string | null> {
		const url = this.normalizeUrl(hostname, 'robots.txt');
		try {
			return await RequestUtils.text(url, this.FETCH_TIMEOUT);
		} catch (error) {
			this.logger.error(`Error fetching robots.txt for ${hostname}: ${error}`);
			return null;
		}
	}

	/**
	 * Возвращает массив URL сайтмепов, найденных в robots.txt или дефолтный путь.
	 */
	private async getSitemapLocations(hostname: string): Promise<string[]> {
		const robotsTxt = await this.getRobotsTxt(hostname);
		if (robotsTxt) {
			const robotsUrl = this.normalizeUrl(hostname, 'robots.txt');
			const robots = robotsParser(robotsUrl, robotsTxt);
			const sitemaps = robots.getSitemaps();
			if (sitemaps.length > 0) return sitemaps;
		}

		// Fallback к стандартному пути, проверяем доступность
		const defaultSitemapUrl = this.normalizeUrl(hostname, 'sitemap.xml');
		const exists = await RequestUtils.exists(defaultSitemapUrl);

		return exists ? [defaultSitemapUrl] : [];
	}

	/**
	 * Корректная сборка URL.
	 */
	private normalizeUrl(hostname: string, path: string): string {
		const base = hostname.startsWith('http') ? hostname : `https://${hostname}`;
		const baseUrl = base.endsWith('/') ? base : `${base}/`;
		try {
			return new URL(path, baseUrl).toString();
		} catch {
			return `${baseUrl}${path}`;
		}
	}
}

export { CrawlersService };
