import { Injectable, Logger } from '@nestjs/common';
import { JSDOM } from 'jsdom';
import { load } from 'cheerio';
import { Readability } from '@mozilla/readability';
import { RequestUtils } from '../../../utils/request/fetch';
import * as crypto from 'crypto';

interface ExtractedContent {
	title: string;
	content: string;
}

@Injectable()
class ContentExtractionService {
	private readonly logger = new Logger(ContentExtractionService.name);

	/**
	 * Извлекает контент из URL
	 * - Fetch HTML
	 * - Парсинг через cheerio и readability
	 * - Удаление всех HTML-тегов и JavaScript
	 * - Обрезка до первых 3000 слов
	 */
	public async extractContent(url: string): Promise<ExtractedContent> {
		try {
			// Fetch HTML
			const html = await RequestUtils.text(url, 15000, {
				headers: {
					'User-Agent': 'LLMs.txt Generator Bot/1.0'
				},
				redirect: 'follow'
			});
			if (!html) {
				throw new Error(`Failed to fetch content or empty response`);
			}

			// Парсинг через Readability
			const dom = new JSDOM(html, { url });
			const reader = new Readability(dom.window.document);
			const article = reader.parse();

			if (!article) {
				throw new Error('Failed to extract content with Readability');
			}

			// Удаление всех HTML-тегов
			const $ = load(article.content);
			const textContent = $.text();

			// Очистка от лишних пробелов и переносов
			const cleanedContent = textContent.replace(/\s+/g, ' ').trim();

			// Обрезка до 3000 слов
			const words = cleanedContent.split(/\s+/);
			const truncatedContent = words.length > 3000 ? words.slice(0, 3000).join(' ') : cleanedContent;

			return {
				title: article.title || 'Untitled',
				content: truncatedContent
			};
		} catch (error) {
			this.logger.error(`Failed to extract content from ${url}:`, error);
			throw new Error(`Content extraction failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Вычисляет SHA256 хеш контента для дедупликации
	 */
	public calculateHash(content: string): string {
		return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
	}
}

export { ContentExtractionService };
