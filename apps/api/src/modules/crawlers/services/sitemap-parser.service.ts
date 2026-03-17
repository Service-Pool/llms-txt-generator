import { Injectable, Logger } from '@nestjs/common';
import { RequestUtils } from '@/utils/request/fetch';
import { XMLParser } from 'fast-xml-parser';
import { gunzipSync } from 'zlib';

interface SitemapEntry {
	loc: string;
	lastmod?: string;
}

interface UrlEntry {
	loc: string;
	lastmod?: string;
	changefreq?: string;
	priority?: number;
}

interface SitemapIndex {
	sitemap: SitemapEntry | SitemapEntry[];
}

interface Urlset {
	url: UrlEntry | UrlEntry[];
}

interface ParsedSitemap {
	sitemapindex?: SitemapIndex;
	urlset?: Urlset;
}

@Injectable()
class SitemapParserService {
	private readonly logger = new Logger(SitemapParserService.name);
	private readonly parser: XMLParser;
	private readonly FETCH_TIMEOUT = 15000;
	private readonly parsedSitemaps = new Set<string>();

	constructor() {
		this.parser = new XMLParser({
			ignoreAttributes: false,
			attributeNamePrefix: '@_',
			textNodeName: '#text',
			parseTagValue: true,
			trimValues: true
		});
	}

	/**
	 * Парсит sitemap и возвращает все URL, включая рекурсивно из sitemapindex.
	 */
	public async parseUrls(sitemapUrl: string): Promise<string[]> {
		this.parsedSitemaps.clear();
		const allUrls: string[] = [];

		await this.parseSitemapRecursive(sitemapUrl, allUrls);

		return [...new Set(allUrls)].filter(url => this.isValidUrl(url));
	}

	/**
	 * Рекурсивный парсинг sitemap с поддержкой sitemapindex.
	 */
	private async parseSitemapRecursive(url: string, accumulator: string[]): Promise<void> {
		// Защита от повторного парсинга одного и того же sitemap
		if (this.parsedSitemaps.has(url)) {
			this.logger.debug(`Skipping already parsed sitemap: ${url}`);
			return;
		}

		this.parsedSitemaps.add(url);
		this.logger.debug(`Parsing sitemap: ${url}`);

		try {
			const content = await this.fetchSitemap(url);
			const parsed = this.parser.parse(content) as ParsedSitemap;

			// Проверяем, это sitemapindex или urlset
			if (parsed.sitemapindex?.sitemap) {
				await this.parseSitemapIndex(parsed.sitemapindex, accumulator);
			} else if (parsed.urlset?.url) {
				this.parseUrlset(parsed.urlset, accumulator);
			} else {
				this.logger.warn(`Unknown sitemap format at ${url}`);
			}
		} catch (error) {
			this.logger.error(`Failed to parse sitemap at ${url}:`, error);
		}
	}

	/**
	 * Получает содержимое sitemap с поддержкой gzip.
	 */
	private async fetchSitemap(url: string): Promise<string> {
		const buffer = await RequestUtils.buffer(url, this.FETCH_TIMEOUT);

		// Проверяем gzip magic bytes (1f 8b)
		if (buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
			this.logger.debug(`Detected gzipped sitemap: ${url}`);
			const decompressed = gunzipSync(buffer);
			return decompressed.toString('utf-8');
		}

		return buffer.toString('utf-8');
	}

	/**
	 * Парсит sitemapindex и рекурсивно обрабатывает вложенные sitemap.
	 */
	private async parseSitemapIndex(sitemapindex: SitemapIndex, accumulator: string[]): Promise<void> {
		const sitemaps = Array.isArray(sitemapindex.sitemap) ? sitemapindex.sitemap : [sitemapindex.sitemap];

		for (const entry of sitemaps) {
			const loc = entry?.loc;

			if (loc && typeof loc === 'string') {
				this.logger.debug(`Found nested sitemap: ${loc}`);
				await this.parseSitemapRecursive(loc, accumulator);
			}
		}
	}

	/**
	 * Парсит urlset и добавляет URL в аккумулятор.
	 */
	private parseUrlset(urlset: Urlset, accumulator: string[]): void {
		const urls = Array.isArray(urlset.url) ? urlset.url : [urlset.url];

		for (const entry of urls) {
			const loc = entry?.loc;

			if (loc && typeof loc === 'string') {
				accumulator.push(loc);
			}
		}

		this.logger.debug(`Parsed ${accumulator.length} URLs from urlset`);
	}

	/**
	 * Валидация URL.
	 */
	private isValidUrl(url: string): boolean {
		try {
			const parsed = new URL(url);
			return ['http:', 'https:'].includes(parsed.protocol);
		} catch {
			return false;
		}
	}
}

export { SitemapParserService };
