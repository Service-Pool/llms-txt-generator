import { Ollama, GenerateRequest } from 'ollama';
import { AiModelConfig } from '@/modules/ai-models/entities/ai-model-config.entity';
import { ProcessedPage } from '@/modules/generations/models/processed-page.model';
import { AbstractLlmService } from '@/modules/generations/services/models/abstractLlm.service';
import { LlmResponseValidator } from '@/modules/generations/services/validators/llm-response.validator';

class OllamaService extends AbstractLlmService {
	private readonly ollama: Ollama;
	private readonly config: AiModelConfig;

	constructor(config: AiModelConfig) {
		super();
		this.config = config;

		if (!config.options?.baseUrl) {
			throw new Error('Ollama baseUrl is required in model config options');
		}

		this.ollama = new Ollama({
			host: config.options.baseUrl
		});
	}

	/**
	 * Генерирует саммари для батча страниц через Ollama за один вызов
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
- Maintain the SAME ORDER as the pages above
- Return an array of objects, each with a "summary" field`;

		// Получаем валидированный ответ от LLM
		const validated = await this.withResilience<Array<{ summary: string }>>(
			async (currentPrompt, _attemptNumber) => {
				const request: GenerateRequest & { stream: false } = {
					model: this.config.modelName,
					prompt: currentPrompt,
					stream: false,
					format: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								summary: { type: 'string', description: 'Concise 2-3 sentence summary' }
							},
							required: ['summary']
						}
					},
					options: {
						temperature: this.config.options.temperature,
						num_predict: this.config.options.maxTokens
					}
				};

				const response = await this.ollama.generate(request);

				return response.response;
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
- Do not mention "this website" or similar phrases, write directly about the content
- Return a JSON object with a "description" field`;

		const result = await this.withResilience<{ description: string }>(
			async (currentPrompt) => {
				const request: GenerateRequest & { stream: false } = {
					model: this.config.modelName,
					prompt: currentPrompt,
					stream: false,
					format: {
						type: 'object',
						properties: {
							description: { type: 'string', description: 'Brief comprehensive website description' }
						},
						required: ['description']
					},
					options: {
						temperature: this.config.options.temperature,
						num_predict: this.config.options.maxTokens
					}
				};

				const response = await this.ollama.generate(request);
				return response.response;
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

export { OllamaService };
