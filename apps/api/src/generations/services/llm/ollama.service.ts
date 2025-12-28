import { Injectable, Logger } from '@nestjs/common';
import { Ollama, GenerateRequest } from 'ollama';
import { z } from 'zod';
import { AiServiceInterface } from './ai-service.interface';
import { AppConfigService } from '../../../config/config.service';
import { UrlSummary } from '../../models/url-summary';

const BatchSummariesSchema = z.record(z.string(), z.string());

/**
 * Ollama LLM service
 *
 * Implements AI summarization using local Ollama instance.
 * Handles batch processing of multiple pages in a single LLM request
 * for efficiency and cost optimization.
 *
 * Technical responsibilities:
 * - Filter pages by technical criteria (has content)
 * - Truncate content to model limits
 * - Format prompts for batch processing
 * - Parse and validate LLM responses
 * - Enrich UrlSummary objects with results
 */
@Injectable()
export class OllamaService implements AiServiceInterface {
	private readonly logger = new Logger(OllamaService.name);
	private readonly maxContentPerPage = 10000;
	private readonly ollama: Ollama;

	public constructor(private readonly configService: AppConfigService) {
		this.ollama = new Ollama({ host: configService.ollama.baseUrl });
	}

	/**
	 * Generate summaries for multiple pages in ONE batch request
	 *
	 * Process:
	 * 1. Filter pages that have text content (technical requirement)
	 * 2. Truncate each page content to maxContentPerPage (10k chars)
	 * 3. Build batch prompt with all pages
	 * 4. Send single request to Ollama with JSON schema
	 * 5. Parse response and enrich UrlSummary objects in-place
	 *
	 * Batch processing benefits:
	 * - Single API call instead of N calls
	 * - Better context for LLM (sees all pages together)
	 * - Significantly faster processing
	 *
	 * Error handling:
	 * - If parsing fails, all summaries marked with error
	 * - If individual URL missing in response, that summary marked with error
	 *
	 * @param summaries - Array of UrlSummary objects to process (modified in-place)
	 */
	public async generatePageSummaries(summaries: UrlSummary[]): Promise<void> {
		this.logger.log(`Generating summaries for ${summaries.length} pages in ONE request`);

		const pagesWithContent = summaries
			.filter(s => s.text.length > 0)
			.map(s => ({ url: s.url, content: s.text }));

		if (pagesWithContent.length === 0) {
			this.logger.warn('No content to generate summaries for');
			return;
		}

		const totalSize = pagesWithContent.reduce((sum, p) => sum + p.content.length, 0);
		this.logger.log(`Total content: ~${Math.round(totalSize / 1000)}k characters`);

		const truncatedPages = pagesWithContent.map(p => ({
			url: p.url,
			content: p.content.length > this.maxContentPerPage
				? p.content.substring(0, this.maxContentPerPage) + '...'
				: p.content
		}));

		const batchPrompt = `Create a concise 2-3 sentence summary for each web page below. Return a JSON object where each key is the page URL and the value is its summary.
							IMPORTANT: Write each summary in the SAME LANGUAGE as the page content (if content is in Czech, write summary in Czech; if Russian, write in Russian, etc.).\n
							${truncatedPages.map((item, index) => `[PAGE ${index + 1}]
							URL: ${item.url}
							CONTENT: ${item.content}
							`).join('\n---\n\n')}`;

		const properties: Record<string, { type: string }> = {};
		truncatedPages.forEach((page) => {
			properties[page.url] = { type: 'string' };
		});

		let response: string | undefined;
		try {
			response = await this.generate({
				model: this.configService.ollama.model,
				prompt: batchPrompt,
				stream: false,
				format: {
					type: 'object',
					properties,
					required: truncatedPages.map(p => p.url)
				},
				options: {
					temperature: this.configService.ollama.temperature,
					num_predict: this.configService.ollama.maxTokens
				}
			});

			this.logger.debug(`Raw Ollama response: ${response}`);

			const obj: unknown = JSON.parse(response);
			const generatedSummaries = BatchSummariesSchema.parse(obj);

			this.logger.log(`Generated ${Object.keys(generatedSummaries).length} summaries`);

			for (const summary of summaries) {
				const generatedText = generatedSummaries[summary.url];
				if (generatedText) {
					summary.summary = generatedText;
				} else {
					summary.setError('No summary generated');
				}
			}
		} catch (error) {
			this.logger.error('Failed to parse AI response:', error);
			if (response) {
				this.logger.error(`Response that failed validation: ${response}`);
			}

			for (const summary of summaries) {
				summary.setError('Failed to generate summary');
			}
		}
	}

	/**
	 * Generate overall website description from page summaries
	 *
	 * Creates a meta-summary that describes the entire website based on
	 * individual page summaries. Used for the header of llms.txt file.
	 *
	 * Process:
	 * 1. Collect all page summaries into numbered list
	 * 2. Truncate to 3000 chars if too long
	 * 3. Ask LLM to synthesize overall website description
	 *
	 * Returns 2-3 sentence description of website's purpose and theme.
	 *
	 * @param summaries - Array of UrlSummary objects with generated summaries
	 * @returns Website description (2-3 sentences)
	 */
	public async generateWebsiteDescription(summaries: UrlSummary[]): Promise<string> {
		this.logger.log(`Generating website description from ${summaries.length} summaries`);

		const summaryTexts = summaries.map((s, i) => `${i + 1}. ${s.summary}`).join('\n');
		const truncatedSummaries = summaryTexts.length > 3000 ? summaryTexts.substring(0, 3000) + '...' : summaryTexts;

		const prompt = `You are a helpful assistant that creates website descriptions.
						Based on the following page summaries from a website, write a brief description (2-3 sentences) of what this website is about. Focus on the overall theme and purpose.
						IMPORTANT: Write the description in the SAME LANGUAGE as the summaries provided below.

						Page summaries:
						${truncatedSummaries}`;

		const description = await this.generate({
			model: this.configService.ollama.model,
			prompt,
			stream: false,
			options: {
				temperature: this.configService.ollama.temperature,
				num_predict: this.configService.ollama.maxTokens
			}
		});
		this.logger.log(`Generated description: ${description.substring(0, 100)}...`);

		return description;
	}

	/**
	 * Low-level wrapper for Ollama API calls
	 *
	 * Handles:
	 * - API communication with local Ollama instance
	 * - Error handling and logging
	 * - Response validation (non-empty check)
	 *
	 * @param request - Ollama generate request configuration
	 * @returns Generated text response from LLM
	 * @throws Error if API call fails or returns empty response
	 */
	private async generate(request: GenerateRequest & { stream?: false }): Promise<string> {
		this.logger.debug(`Generating with model: ${request.model}`);

		try {
			const response = await this.ollama.generate(request);
			const text = response.response;

			if (!text) {
				throw new Error('Empty response from Ollama API');
			}

			this.logger.debug(`Received response: ${text.length} chars`);
			return text.trim();
		} catch (error) {
			this.logger.error(`Ollama API call failed:`, error);
			throw new Error(`Ollama API error: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
}
