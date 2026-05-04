import { ProcessedPage } from '@/modules/generations/models/processed-page.model';

interface ClusterSection {
	section_name: string;
	description: string;
	pages: { filename: string; title: string; summary: string; md_content: string }[];
}

class LlmsTxtFormatter {
	public static formatFlat(hostname: string, description: string, pages: ProcessedPage[]): string {
		const lines: string[] = [
			`# ${hostname}`,
			description,
			'',
			'## Pages'
		];

		for (const page of pages) {
			lines.push(`- [${page.title}](${page.url}): ${page.summary || ''}`);
		}

		return lines.join('\n');
	}

	public static formatClustered(host: string, description: string, sections: ClusterSection[]): string {
		const lines: string[] = [
			`# ${host}`,
			description
		];

		for (const section of sections) {
			const sectionSlug = section.section_name;
			const title = sectionSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

			lines.push('');
			lines.push(`## ${title}`);
			lines.push(section.description);

			for (const page of section.pages) {
				const url = `/${sectionSlug}/${page.filename}.md`;
				lines.push(`- [${page.title}](${url}): ${page.summary}`);
				lines.push('<!-- md -->');
				lines.push(page.md_content);
				lines.push('<!-- /md -->');
			}
		}

		return lines.join('\n');
	}
}

export { LlmsTxtFormatter };
