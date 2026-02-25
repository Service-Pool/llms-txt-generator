import { Injectable, Logger } from '@nestjs/common';
import { load } from 'cheerio';
import { RequestUtils } from '@/utils/request/fetch';
import { PageProcessingError } from '@/exceptions/page-processing.exception';
import * as crypto from 'crypto';

interface ExtractedContent {
	title: string;
	content: string;
}

@Injectable()
class ContentExtractionService {
	private readonly logger = new Logger(ContentExtractionService.name);
	private readonly MAX_WORDS = 300;

	/**
	 * Извлекает контент из URL
	 * - Fetch HTML
	 * - Парсинг через cheerio (без браузерного окружения)
	 * - Удаление шумовых элементов (script, style, nav и т.д.)
	 * - Обрезка до первых MAX_WORDS слов
	 */
	public async extractContent(url: string): Promise<ExtractedContent> {
		try {
			// Fetch HTML
			this.logger.debug(`Fetching HTML from ${url}`);
			const fetchStart = Date.now();
			const html = await RequestUtils.text(url, 15000, {
				headers: {
					'User-Agent': 'LLMs.txt Generator Bot/1.0'
				},
				redirect: 'follow'
			});
			const fetchDuration = Date.now() - fetchStart;
			this.logger.debug(`HTML fetched in ${fetchDuration}ms from ${url}`);

			// Парсинг через cheerio — никаких ресурсов, только DOM в памяти
			const parseStart = Date.now();
			const $ = load(html);

			const title = $('title').first().text().trim() || 'Untitled';

			// Удаляем всё, что не несёт текстового контента
			$('script, style, noscript, iframe, svg, img, video, audio, canvas, figure, nav, footer, header, aside, [aria-hidden="true"]').remove();

			const textContent = $('body').text();
			const parseDuration = Date.now() - parseStart;
			this.logger.debug(`Content parsed in ${parseDuration}ms from ${url}`);

			if (!textContent.trim()) {
				throw new PageProcessingError(`No readable text to extract from ${url}`);
			}

			// Очистка от лишних пробелов и переносов
			const cleanedContent = textContent.replace(/\s+/g, ' ').trim();

			// Обрезка до MAX_WORDS слов
			const words = cleanedContent.split(/\s+/);
			const truncatedContent = words.length > this.MAX_WORDS ? words.slice(0, this.MAX_WORDS).join(' ') : cleanedContent;

			return { title, content: truncatedContent };
		} catch (error) {
			this.logger.error(`Failed to extract content from ${url}:`, error);
			throw error;
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
