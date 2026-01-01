import { HttpService } from '../../../modules/http/http.module';
import { Injectable, Logger } from '@nestjs/common';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

interface ExtractedContent {
	title: string;
	text: string;
}

/**
 * Content extractor service
 * Extracts main text content from web pages using Mozilla Readability
 */
@Injectable()
export class ContentExtractorService {
	private readonly logger = new Logger(ContentExtractorService.name);

	public constructor(private readonly httpService: HttpService) {}

	/**
	 * Extract title and main text content from a URL
	 */
	public async extractText(pageUrl: string): Promise<ExtractedContent> {
		try {
			// Fetch HTML using HttpService
			const response = await this.httpService.axios.get<string>(pageUrl, {
				responseType: 'text',
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
				}
			});

			// Create DOM from HTML
			const dom = new JSDOM(response.data, {
				url: pageUrl
			});

			const reader = new Readability(dom.window.document);
			const article = reader.parse();

			if (!article) {
				throw new Error('Failed to parse article');
			}

			// Извлечь только текст (убрать HTML теги)
			const textContent = (article.textContent || '')
				.replace(/\s+/g, ' ') // Заменить множественные пробелы на один
				.trim();

			return {
				title: article.title || 'Untitled',
				text: textContent
			};
		} catch (error) {
			this.logger.error(`Failed to extract text from ${pageUrl}:`, error instanceof Error ? error.message : String(error));

			// Вернуть пустой результат при ошибке
			return {
				title: 'Error',
				text: ''
			};
		}
	}
}
