import { Logger } from '@nestjs/common';
import { ProcessedPage } from '@/modules/generations/models/processed-page.model';
import { ClusterPage } from '@/modules/generations/models/cluster-page.model';
import { LlmJsonValidationException } from '@/exceptions/llm-json-validation.exception';
import { llmLogger } from '@/config/config.logger';

abstract class AbstractLlmService {
	protected readonly logger = new Logger(this.constructor.name);
	protected readonly llmLogger = llmLogger;

	abstract generateBatchSummaries(pages: ProcessedPage[]): Promise<string[]>;

	abstract generateDescription(summaries: string[]): Promise<string>;

	abstract generateClusterContent(
		pages: ClusterPage[],
		onPageProgress?: (pageCurrent: number, pageTotal: number) => Promise<void>
	): Promise<{
		section_name: string;
		description: string;
		pages: { filename: string; title: string; summary: string; md_content: string }[];
		truncatedPages: string[];
	}>;

	protected parseJsonResponse<T>(response: string, attemptNumber: number): T {
		try {
			return JSON.parse(response) as T;
		} catch {
			try {
				const extracted = this.extractJsonFromMarkdown(response);
				return JSON.parse(extracted) as T;
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				throw new LlmJsonValidationException(
					`Failed to parse LLM response as JSON: ${errorMessage}. Response: ${response.slice(0, 200)}`,
					response,
					attemptNumber
				);
			}
		}
	}

	protected extractJsonFromMarkdown(text: string): string {
		const jsonBlockMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
		if (jsonBlockMatch) {
			return jsonBlockMatch[1].trim();
		}
		return text.trim();
	}
}

export { AbstractLlmService };
