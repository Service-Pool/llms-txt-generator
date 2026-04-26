import { GoogleGenAI, Type, GenerateContentParameters, GenerateContentResponse, ApiError } from '@google/genai';
import { parallelMap } from '@/utils/parallel-map';
import { AiModelConfig } from '@/modules/ai-models/entities/ai-model-config.entity';
import { ProcessedPage } from '@/modules/generations/models/processed-page.model';
import { ClusterPage } from '@/modules/generations/models/cluster-page.model';
import { AbstractLlmService } from '@/modules/generations/services/models/abstractLlm.service';

interface ClusterPageOutput {
	filename: string;
	title: string;
	summary: string;
	md_content: string;
}

const INIT_PROMPT = `Instructions:
- Choose a concise section name (lowercase with hyphens, e.g. "payment-methods") — this will be used as a URL namespace
- Write a 1-2 sentence description of what this section covers
- Decide how many output pages you will generate from this input (you may merge, split or skip pages as needed)
- Return ONLY section_name, description, and total_pages (integer). Do NOT generate page content yet.`;

const INIT_RESPONSE_SCHEMA = {
	type: Type.OBJECT,
	properties: {
		section_name: { type: Type.STRING },
		description: { type: Type.STRING },
		total_pages: { type: Type.INTEGER }
	},
	required: ['section_name', 'description', 'total_pages']
};

const PAGE_META_RESPONSE_SCHEMA = {
	type: Type.OBJECT,
	properties: {
		filename: { type: Type.STRING },
		title: { type: Type.STRING },
		summary: { type: Type.STRING }
	},
	required: ['filename', 'title', 'summary']
};

function formatUsage(label: string, r: GenerateContentResponse): string {
	const m = r.usageMetadata;
	const cached = m?.cachedContentTokenCount ?? 0;
	const billed = (m?.promptTokenCount ?? 0) - cached;
	const thinking = (m as Record<string, unknown>)?.thoughtsTokenCount as number | undefined;
	const thinkingPart = thinking !== undefined ? ` thinkingTokens=${thinking}` : '';
	return `${label}: billedInputTokens=${billed} cachedTokens=${cached} outputTokens=${m?.candidatesTokenCount}${thinkingPart} finishReason=${r.candidates?.[0]?.finishReason}`;
}

class GeminiService extends AbstractLlmService {
	private static readonly CACHE_TTL = '600s';

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
			async (currentPrompt) => {
				const request: GenerateContentParameters = {
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
				};

				const response = await this.generateContent(request);
				return response.text;
			},
			{
				initialPrompt,
				operationName: 'generateBatchSummaries',
				validation: {
					expectedCount: pages.length,
					requireSummaryFields: true
				}
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
	public async generateDescription(summaries: string[]): Promise<string> {
		const summariesText = summaries
			.map((s, idx) => `${idx + 1}. ${s}`)
			.join('\n');

		const initialPrompt = `You are analyzing a website based on summaries of its pages. Create a brief, comprehensive description of what this website offers.

Summaries:
${summariesText}

Instructions:
- Write a single paragraph (2-4 sentences)
- Describe the overall purpose and main topics of the website
- Be concise and informative
- Use professional language
- Do not mention "this website" or similar phrases, write directly about the content`;

		const result = await this.withResilience<{ description: string }>(
			async (currentPrompt) => {
				const response = await this.generateContent({
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
				operationName: 'generateDescription',
				validation: {
					requireDescriptionField: true
				}
			}
		);

		const description = result.description.trim();
		this.logger.log(`Generated website description from ${summaries.length} summaries`);

		return description;
	}

	/**
	 * Builds a cache strategy for a cluster.
	 * If the content is large enough, creates a Gemini context cache and returns a strategy
	 * that injects cachedContent into every request config and prepends nothing to prompts.
	 * If the content is too small (min_total_token_count not met), falls back to a strategy
	 * that injects systemInstruction and prepends pagesText to every prompt.
	 */
	private async createCacheStrategy(model: string, systemInstruction: string, pagesText: string, baseConfig: Record<string, unknown>): Promise<{
		config: Record<string, unknown>;
		getContents: (prompt: string) => string;
		dispose: () => Promise<void>;
		refreshIfNeeded: () => void;
	}> {
		try {
			const cached = await this.ai.caches.create({
				model,
				config: { ttl: GeminiService.CACHE_TTL, systemInstruction, contents: `Pages:\n${pagesText}` }
			});
			this.logger.debug(`createCacheStrategy: created cache "${cached.name}"`);
			return {
				config: { ...baseConfig, cachedContent: cached.name },
				getContents: (prompt: string) => prompt,
				dispose: async () => { await this.ai.caches.delete({ name: cached.name }).catch(() => { }); },
				refreshIfNeeded: () => { void this.ai.caches.update({ name: cached.name, config: { ttl: GeminiService.CACHE_TTL } }).catch(() => { }); }
			};
		} catch (err) {
			if (err instanceof ApiError && err.status === 400 && err.message.includes('min_total_token_count')) {
				this.logger.debug(`createCacheStrategy: content too small, falling back to inline context`);
				return {
					config: { ...baseConfig, systemInstruction },
					getContents: prompt => `Pages:\n${pagesText}\n\n${prompt}`,
					dispose: () => Promise.resolve(),
					refreshIfNeeded: () => { }
				};
			}
			throw err;
		}
	}

	/**
	 * Генерирует md-блоки для кластера страниц.
	 * Шаг 1: кэшируем весь контент кластера в Google, узнаём section_name/description/total_pages.
	 * Шаг 2: для каждой страницы 2 запроса последовательно (meta JSON + md_content plain text),
	 *         страницы параллелятся с concurrency=5 и стартовой задержкой 1с между слотами.
	 */
	public async generateClusterContent(pages: ClusterPage[], onPageProgress?: (pageCurrent: number, pageTotal: number) => Promise<void>): Promise<{
		section_name: string;
		description: string;
		pages: ClusterPageOutput[];
		truncatedPages: string[];
	}> {
		const pagesText = pages
			.map((p, idx) => `Page ${idx + 1}:\nPath: ${p.path}\nTitle: ${p.title}\nContent:\n${p.text}`)
			.join('\n\n---\n\n');

		const baseConfig = {
			temperature: this.config.options.temperature,
			maxOutputTokens: this.config.options.maxTokens,
			responseMimeType: 'application/json' as const,
			thinkingConfig: { thinkingBudget: 0 }
		};

		const systemInstruction = 'You are analyzing a group of semantically related web pages. Create a documentation section for this group.';
		const strategy = await this.createCacheStrategy(this.config.modelName, systemInstruction, pagesText, baseConfig);

		try {
			// Шаг 1: узнаём section_name, description и total_pages
			const initResponse = await this.generateContent({
				model: this.config.modelName,
				contents: strategy.getContents(INIT_PROMPT),
				config: { ...strategy.config, responseSchema: INIT_RESPONSE_SCHEMA }
			});

			this.logger.debug(formatUsage('generateClusterContent init', initResponse));

			const { section_name, description, total_pages }
				= this.parseJsonResponse<{ section_name: string; description: string; total_pages: number }>(initResponse.text, 1);

			this.logger.log(`generateClusterContent: section="${section_name}" total_pages=${total_pages} input_pages=${pages.length}`);

			const SLOT_DELAY_MS = 1000;
			const pageNums = Array.from({ length: total_pages }, (_, i) => i + 1);
			let pagesCompleted = 0;

			const allPages = await parallelMap(pageNums, async (pageNum: number, slotIndex: number) => {
				await new Promise(resolve => setTimeout(resolve, slotIndex * SLOT_DELAY_MS));

				strategy.refreshIfNeeded();

				// Запрос 1: filename, title, summary
				const metaResponse = await this.generateContent({
					model: this.config.modelName,
					contents: strategy.getContents(`Generate page ${pageNum} of your documentation plan for this section. Return only filename (lowercase with hyphens, no extension, unique within section), title, and one-line summary.`),
					config: { ...strategy.config, responseSchema: PAGE_META_RESPONSE_SCHEMA }
				});
				this.logger.debug(formatUsage(`generateClusterContent page ${pageNum} meta`, metaResponse));

				const meta = this.parseJsonResponse<{ filename: string; title: string; summary: string }>(metaResponse.text, 1);

				// Запрос 2: md_content как plain text
				const contentResponse = await this.generateContent({
					model: this.config.modelName,
					contents: strategy.getContents(`Generate the md_content for page ${pageNum} ("${meta.filename}") of your documentation plan. Return only the raw markdown text — no JSON, no code blocks, no explanation.`),
					config: { ...strategy.config, responseMimeType: 'text/plain' }
				});
				this.logger.debug(formatUsage(`generateClusterContent page ${pageNum} content`, contentResponse));

				const contentFinishReason = contentResponse.candidates?.[0]?.finishReason;
				const rawContent = (contentResponse.text ?? '').trim();
				const truncated = String(contentFinishReason) === 'MAX_TOKENS';
				const md_content = truncated ? `${rawContent}\n\n<!-- truncated by AI -->` : rawContent;
				const result = { ...meta, md_content, truncated };
				if (onPageProgress) await onPageProgress(++pagesCompleted, total_pages);
				return result;
			}, this.config.options.llmConcurrency);

			const truncatedPages = allPages
				.filter((p): p is ClusterPageOutput & { truncated: true } => (p as { truncated: boolean }).truncated)
				.map(p => p.filename);
			if (truncatedPages.length > 0) {
				this.logger.warn(`generateClusterContent: ${truncatedPages.length} page(s) truncated: ${truncatedPages.join(', ')}`);
			}

			this.logger.log(`Generated section "${section_name}" with ${allPages.length} pages for cluster of ${pages.length} input pages`);
			const outputPages: ClusterPageOutput[] = allPages.map(({ truncated: _t, ...p }) => p);
			return { section_name, description, pages: outputPages, truncatedPages };
		} finally {
			await strategy.dispose();
		}
	}

	/**
	 * Обёртка над generateContent с автоматическим retry при 429.
	 * Читает retryDelay из ответа Google и ждёт точно столько сколько сказано.
	 */
	private async generateContent(params: Parameters<typeof this.ai.models.generateContent>[0]): Promise<ReturnType<typeof this.ai.models.generateContent>> {
		const MAX_RETRIES = 3;
		for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
			try {
				return await this.ai.models.generateContent(params);
			} catch (err) {
				const status = (err as Record<string, unknown>)?.status as number | undefined
					?? ((err as Record<string, unknown>)?.error as Record<string, unknown>)?.code as number | undefined;

				if (status !== 429 && status !== 503) throw err;

				let retryDelayMs: number;
				if (status === 429) {
					const errObj = err as Record<string, unknown>;
					const details = (errObj?.error as Record<string, unknown>)?.details as Record<string, unknown>[] | undefined;
					const retryInfo = details?.find(d => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo');
					const retryDelayStr = retryInfo?.['retryDelay'] as string | undefined;
					retryDelayMs = retryDelayStr ? parseFloat(retryDelayStr) * 1000 : 10000;
				} else {
					retryDelayMs = 5000 * attempt;
				}
				retryDelayMs += Math.random() * 3000;

				if (attempt === MAX_RETRIES) {
					throw new Error(`AI service unavailable (${status}), please try again in ${Math.ceil(retryDelayMs / 1000)} seconds`);
				}

				this.logger.warn(`generateContent: ${status} error, waiting ${retryDelayMs}ms before retry ${attempt}/${MAX_RETRIES}`);
				await new Promise(resolve => setTimeout(resolve, retryDelayMs));
			}
		}
		throw new Error('generateContent: unreachable');
	}
}

export { GeminiService };
