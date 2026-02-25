import { GoogleGenAI, Type } from '@google/genai';
import { AiModelConfig } from '@/modules/ai-models/entities/ai-model-config.entity';
import { ProcessedPage } from '@/modules/generations/models/processed-page.model';
import { AbstractLlmService } from '@/modules/generations/services/models/abstractLlm.service';
import { LlmResponseValidator } from '@/modules/generations/services/validators/llm-response.validator';

class GeminiService extends AbstractLlmService {
	private readonly ai: GoogleGenAI;
	private readonly config: AiModelConfig;

	constructor(config: AiModelConfig) {
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
	public async generateBatchSummaries(pages: ProcessedPage[]): Promise<string[]> {
		const pagesText = pages
			.map((page, idx) => `Page ${idx + 1}:\nTitle: ${page.title}\nURL: ${page.url}\nContent:\n${page.content}\n`)
			.join('\n\n');

		const initialPrompt = `You are a technical documentation summarizer. Your task is to create concise summaries for multiple web pages.

${pagesText}

Instructions:
- Create a summary for EACH page in 2-3 sentences
- Focus on the main purpose and key information
- Use clear, professional language
- Do not include meta information like "this page describes"
- Write in present tense
- Maintain the SAME ORDER as the pages above`;

		// Получаем валидированный ответ от LLM
		const validated = await this.withResilience<Array<{ summary: string }>>(
			async (currentPrompt, _attemptNumber) => {
				const response = await this.ai.models.generateContent({
					model: this.config.modelName,
					contents: currentPrompt,
					config: {
						temperature: this.config.options.temperature,
						maxOutputTokens: this.config.options.maxTokens,
						responseMimeType: 'application/json',
						responseSchema: {
							type: Type.ARRAY,
							items: {
								type: Type.OBJECT,
								properties: {
									summary: {
										type: Type.STRING,
										description: 'Concise 2-3 sentence summary of the page content'
									}
								},
								required: ['summary']
							}
						}
					}
				});

				return response.text;
			},
			{
				initialPrompt,
				validators: [
					(result, attemptNumber) => { LlmResponseValidator.validateCount(result, pages.length, attemptNumber); },
					(result, attemptNumber) => { LlmResponseValidator.validateSummaryFields(result, attemptNumber); }
				],
				operationName: 'generateBatchSummaries'
			}
		);

		// Трансформируем в финальный формат (после валидации)
		const summaries = validated.map(item => item.summary.trim());

		this.logger.debug(`Generated ${summaries.length} summaries in batch`);

		return summaries;
	}

	/**
	 * Генерирует общее описание сайта на основе всех саммари
	 */
	public async generateDescription(pages: ProcessedPage[]): Promise<string> {
		const summariesText = pages
			.map((page, idx) => `${idx + 1}. ${page.title}: ${page.summary}`)
			.join('\n');

		const initialPrompt = `You are analyzing a website based on summaries of its pages. Create a brief, comprehensive description of what this website offers.

Page summaries:
${summariesText}

Instructions:
- Write a single paragraph (2-4 sentences)
- Describe the overall purpose and main topics of the website
- Be concise and informative
- Use professional language
- Do not mention "this website" or similar phrases, write directly about the content`;

		const result = await this.withResilience<{ description: string }>(
			async (currentPrompt) => {
				const response = await this.ai.models.generateContent({
					model: this.config.modelName,
					contents: currentPrompt,
					config: {
						temperature: this.config.options.temperature,
						maxOutputTokens: this.config.options.maxTokens,
						responseMimeType: 'application/json',
						responseSchema: {
							type: Type.OBJECT,
							properties: {
								description: {
									type: Type.STRING,
									description: 'Brief comprehensive website description'
								}
							},
							required: ['description']
						}
					}
				});

				return response.text;
			},
			{
				initialPrompt,
				validators: [
					(result, attemptNumber) => { LlmResponseValidator.validateDescriptionField(result, attemptNumber); }
				],
				operationName: 'generateDescription'
			}
		);

		const description = result.description.trim();
		this.logger.log(`Generated website description from ${pages.length} page summaries`);

		return description;
	}
}

export { GeminiService };
