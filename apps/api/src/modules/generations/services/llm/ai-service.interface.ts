import { UrlSummary } from '../../models/url-summary';

/**
 * LLM service interface
 * Provides abstraction for different LLM providers (Ollama, Gemini, etc.)
 */
export interface AiServiceInterface {
	/**
	 * Generate summaries for a batch of UrlSummary objects in ONE AI request
	 * @param summaries - Array of UrlSummary objects with extracted text content
	 */
	generatePageSummaries(summaries: UrlSummary[]): Promise<void>;

	/**
	 * Generate overall website description based on page summaries
	 * @param summaries - Array of UrlSummary objects with summaries
	 * @returns Website description (1-2 paragraphs)
	 */
	generateWebsiteDescription(summaries: UrlSummary[]): Promise<string>;
}
