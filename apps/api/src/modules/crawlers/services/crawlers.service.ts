import { Injectable, Logger } from '@nestjs/common';
import { RequestUtils } from '@/utils/request/fetch';
import robotsParser from 'robots-parser';
import Sitemapper, { SitemapperSiteData } from 'sitemapper';

@Injectable()
class CrawlersService {
	private readonly logger = new Logger(CrawlersService.name);
	private readonly FETCH_TIMEOUT = 2000;
	private readonly sitemapper: Sitemapper;

	constructor() {
		this.sitemapper = new Sitemapper({
			timeout: 15000,
			requestHeaders: { 'User-Agent': 'LLMs.txt Generator Bot/1.0' }
		});
	}

	/**
	 * Валидатор: существует ли robots.txt и доступен ли он.
	 */
	public async checkRobotsTxt(hostname: string): Promise<boolean> {
		const content = await this.getRobotsTxt(hostname);
		return content !== null && content.length > 0;
	}

	/**
	 * Валидатор: существует ли хотя бы один рабочий sitemap.
	 */
	public async checkSitemapXml(hostname: string): Promise<boolean> {
		const locations = await this.getSitemapLocations(hostname);

		// Проверяем доступность хотя бы одного указанного файла
		const checks = await Promise.all(locations.map(url => this.exists(url)));
		return checks.some(result => result === true);
	}

	/**
	 * Парсит все найденные сайтмепы и возвращает плоский список уникальных валидных URL.
	 */
	public async getAllSitemapUrls(hostname: string): Promise<string[]> {
		const locations = await this.getSitemapLocations(hostname);
		const allSites: string[] = [];
		const parsedSitemaps = new Set<string>();

		const parseSitemap = async (url: string) => {
			if (parsedSitemaps.has(url)) return;
			parsedSitemaps.add(url);
			try {
				const { sites } = await this.sitemapper.fetch(url);
				if (Array.isArray(sites) && sites.length > 0) {
					for (const site of sites) {
						if (typeof site === 'string') {
							allSites.push(site);
						} else {
							allSites.push((site as SitemapperSiteData).loc);
						}
					}
				}
			} catch (error) {
				this.logger.warn(`Failed to parse sitemap at ${url}: ${error}`);
			}
		};

		for (const url of locations) {
			await parseSitemap(url);
		}

		return this.sanitizeUrls(allSites);
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
		// Fallback к стандартному пути
		return [this.normalizeUrl(hostname, 'sitemap.xml')];
	}

	/**
	 * Проверка доступности ресурса через HEAD запрос.
	 */
	private async exists(url: string): Promise<boolean> {
		try {
			const controller = new AbortController();
			const id = setTimeout(() => {
				controller.abort();
			}, this.FETCH_TIMEOUT);

			const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
			clearTimeout(id);
			return res.ok;
		} catch {
			return false;
		}
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

	/**
	 * Очистка списка URL.
	 */
	private sanitizeUrls(urls: string[]): string[] {
		return [...new Set(urls)].filter((u) => {
			try {
				const url = new URL(u);
				return ['http:', 'https:'].includes(url.protocol);
			} catch {
				return false;
			}
		});
	}
}

export { CrawlersService };
