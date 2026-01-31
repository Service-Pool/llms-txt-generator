import { Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { ModelConfigDto } from '../../models/dto/model-config.dto';
import { BaseLLMProviderService, PageSummary } from './base-llm-provider.service';

class GeminiService extends BaseLLMProviderService {
	private readonly logger = new Logger(GeminiService.name);
	private readonly ai: GoogleGenAI;
	private readonly config: ModelConfigDto;

	constructor(config: ModelConfigDto) {
		super();
		this.config = config;

		if (!config.options?.apiKey) {
			throw new Error('Gemini API key is required in model config options');
		}

		this.ai = new GoogleGenAI({ apiKey: config.options.apiKey });
	}

	/**
	 * Генерирует краткое саммари для одной страницы через Gemini API
	 */
	async generateSummary(content: string, title: string): Promise<string> {
		try {
			const prompt = `You are a technical documentation summarizer. Your task is to create a concise summary of a web page.

Page title: ${title}

Page content:
${content}

Instructions:
- Create a summary in 2-3 sentences
- Focus on the main purpose and key information
- Use clear, professional language
- Do not include meta information like "this page describes"
- Write in present tense

Summary:`;

			const response = await this.ai.models.generateContent({
				model: this.config.modelName,
				contents: prompt,
				config: {
					temperature: this.config.options.temperature,
					maxOutputTokens: this.config.options.maxTokens
				}
			});

			const summary = response.text.trim();

			this.logger.debug(`Generated summary for "${title}" (${content.length} chars)`);

			return summary;
		} catch (error) {
			this.logger.error(
				`Failed to generate summary for "${title}":`,
				error
			);
			throw new Error(`Gemini API error: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Генерирует общее описание сайта на основе всех саммари
	 */
	async generateDescription(summaries: PageSummary[]): Promise<string> {
		try {
			const summariesText = summaries
				.map((s, idx) => `${idx + 1}. ${s.title}: ${s.summary}`)
				.join('\n');

			const prompt = `You are analyzing a website based on summaries of its pages. Create a brief, comprehensive description of what this website offers.

Page summaries:
${summariesText}

Instructions:
- Write a single paragraph (2-4 sentences)
- Describe the overall purpose and main topics of the website
- Be concise and informative
- Use professional language
- Do not mention "this website" or similar phrases, write directly about the content

Description:`;

			const response = await this.ai.models.generateContent({
				model: this.config.modelName,
				contents: prompt,
				config: {
					temperature: this.config.options.temperature,
					maxOutputTokens: this.config.options.maxTokens
				}
			});

			const description = response.text.trim();

			this.logger.log(`Generated website description from ${summaries.length} page summaries`);

			return description;
		} catch (error) {
			this.logger.error('Failed to generate website description:', error);
			throw new Error(`Gemini API error: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
}

export { GeminiService };
