import { ContentExtractorService } from '../services/content-extractor.service';

export class UrlSummary {
	readonly url: string;
	title: string = '';
	text: string = '';
	summary: string = '';
	error: string | null = null;

	public constructor(url: string, private readonly contentExtractor: ContentExtractorService) {
		this.url = url;
	}

	get isValid(): boolean {
		return this.error === null && this.summary.length > 0;
	}

	public async extract(): Promise<void> {
		const { title, text } = await this.contentExtractor.extractText(this.url);
		this.title = title;
		this.text = text;
	}

	public setContent(title: string, summary: string): void {
		this.title = title;
		this.summary = summary;
	}

	public setError(message: string): void {
		this.error = message;
		this.summary = 'Error: ' + message;
		this.title = 'Error';
	}

	public toCacheData(): { title: string; summary: string } {
		return { title: this.title, summary: this.summary };
	}

	public toEntry(): { url: string; title: string; summary: string } {
		return {
			url: this.url,
			title: this.title,
			summary: this.summary
		};
	}
}
