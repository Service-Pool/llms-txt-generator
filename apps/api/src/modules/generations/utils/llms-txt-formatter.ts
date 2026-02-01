/**
 * Utility class for formatting llms.txt output
 */
interface PageSummary {
	url: string;
	title: string;
	summary: string;
}

class LlmsTxtFormatter {
	/**
	 * Format website data into llms.txt format
	 * @param hostname - The website hostname
	 * @param description - The website description
	 * @param pages - Array of page summaries
	 * @returns Formatted llms.txt content
	 */
	public static format(hostname: string, description: string, pages: PageSummary[]): string {
		const lines: string[] = [
			`# ${hostname}`,
			'',
			`> ${description}`,
			'',
			'## Pages',
			''
		];

		for (const page of pages) {
			lines.push(`### ${page.title}`);
			lines.push(`URL: ${page.url}`);
			lines.push('');
			lines.push(page.summary);
			lines.push('');
		}

		return lines.join('\n');
	}
}

export { LlmsTxtFormatter };
