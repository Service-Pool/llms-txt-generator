import { Logger } from '@nestjs/common';
import { Ollama, GenerateRequest } from 'ollama';
import { ModelConfigDto } from '../../ai-models/dto/ai-model-config.dto';
import { BaseLLMProviderService, PageSummary } from './base-llm-provider.service';

class OllamaService extends BaseLLMProviderService {
	private readonly logger = new Logger(OllamaService.name);
	private readonly ollama: Ollama;
	private readonly config: ModelConfigDto;

	constructor(config: ModelConfigDto) {
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
	 * Генерирует краткое саммари для одной страницы через Ollama (локальный LLM)
	 */
	public async generateSummary(content: string, title: string): Promise<string> {
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

			const request: GenerateRequest & { stream: false } = {
				model: this.config.modelName,
				prompt,
				stream: false,
				options: {
					temperature: this.config.options.temperature,
					num_predict: this.config.options.maxTokens
				}
			};

			const response = await this.ollama.generate(request);

			const summary = response.response.trim();

			this.logger.debug(`Generated summary for "${title}" (${content.length} chars)`);

			return summary;
		} catch (error) {
			this.logger.error(
				`Failed to generate summary for "${title}":`,
				error
			);
			throw new Error(`Ollama API error: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Генерирует общее описание сайта на основе всех саммари
	 */
	public async generateDescription(summaries: PageSummary[]): Promise<string> {
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

			const request: GenerateRequest & { stream: false } = {
				model: this.config.modelName,
				prompt,
				stream: false,
				options: {
					temperature: this.config.options.temperature,
					num_predict: this.config.options.maxTokens
				}
			};

			const response = await this.ollama.generate(request);

			const description = response.response.trim();

			this.logger.log(`Generated website description from ${summaries.length} page summaries`);

			return description;
		} catch (error) {
			this.logger.error('Failed to generate website description:', error);
			throw new Error(`Ollama API error: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
}

export { OllamaService };
