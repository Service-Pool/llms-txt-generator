import { Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { ModelConfigDto } from '../../../ai-models/dto/ai-model-config.dto';
import { LLMProviderService, PageContent } from '../llm-provider.service';

class GeminiService extends LLMProviderService {
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
	 * Генерирует саммари для батча страниц через Gemini API за один вызов
	 */
	public async generateBatchSummaries(pages: PageContent[]): Promise<string[]> {
		try {
			// Формируем промпт со всеми страницами
			const pagesText = pages
				.map((page, idx) => `Page ${idx + 1}:\nTitle: ${page.title}\nURL: ${page.url}\nContent:\n${page.content}\n`)
				.join('\n\n');

			const prompt = `You are a technical documentation summarizer. Your task is to create concise summaries for multiple web pages.

${pagesText}

Instructions:
- Create a summary for EACH page in 2-3 sentences
- Focus on the main purpose and key information
- Use clear, professional language
- Do not include meta information like "this page describes"
- Write in present tense
- Return ONLY a valid JSON array with exactly ${pages.length} objects
- Each object must have a "summary" field with the summary text
- Maintain the SAME ORDER as the pages above

Example format:
[{"summary": "First page summary here"}, {"summary": "Second page summary here"}]

JSON Response:`;

			const response = await this.ai.models.generateContent({
				model: this.config.modelName,
				contents: prompt,
				config: {
					temperature: this.config.options.temperature,
					maxOutputTokens: this.config.options.maxTokens
				}
			});

			const fullText = response.text.trim();

			// Парсим JSON ответ
			let parsed: Array<{ summary: string }>;
			try {
				// Удаляем возможные markdown код-блоки
				const jsonText = fullText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
				parsed = JSON.parse(jsonText) as { summary: string }[];
			} catch (parseError) {
				throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
			}

			if (!Array.isArray(parsed)) {
				throw new Error('Response is not a JSON array');
			}

			if (parsed.length !== pages.length) {
				throw new Error(`Expected ${pages.length} summaries, got ${parsed.length}`);
			}

			const summaries = parsed.map((item, idx) => {
				if (!item.summary || typeof item.summary !== 'string') {
					throw new Error(`Invalid summary at index ${idx}: missing or invalid "summary" field`);
				}
				return item.summary.trim();
			});

			this.logger.debug(`Generated ${summaries.length} summaries in batch`);

			return summaries;
		} catch (error) {
			this.logger.error(`Failed to generate batch summaries:`, error);
			throw new Error(`Gemini API error: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Генерирует общее описание сайта на основе всех саммари
	 */
	public async generateDescription(pages: PageContent[]): Promise<string> {
		try {
			const summariesText = pages
				.map((page, idx) => `${idx + 1}. ${page.title}: ${page.summary}`)
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

			this.logger.log(`Generated website description from ${pages.length} page summaries`);

			return description;
		} catch (error) {
			this.logger.error('Failed to generate website description:', error);
			throw new Error(`Gemini API error: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
}

export { GeminiService };
