import { PageContent } from '../services/llm-provider.service';

/**
 * Utility class for formatting llms.txt output
 */
class LlmsTxtFormatter {
	/**
	 * Format website data into llms.txt format
	 * @param hostname - The website hostname
	 * @param description - The website description
	 * @param pages - Array of pages with summaries
	 * @returns Formatted llms.txt content
	 */
	public static format(hostname: string, description: string, pages: PageContent[]): string {
		const lines: string[] = [
			`# ${hostname}`,
			'',
			`> ${description}`,
			'',
			'## Pages',
			''
		];

		for (const page of pages) {
			lines.push(`- [${page.title}](${page.url}): ${page.summary || ''}`);
		}

		return lines.join('\n');
	}
}

export { LlmsTxtFormatter };
