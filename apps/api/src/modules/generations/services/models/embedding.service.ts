import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { AppConfigService } from '@/config/config.service';

@Injectable()
class EmbeddingService {
	private readonly logger = new Logger(EmbeddingService.name);
	private readonly ai: GoogleGenAI;

	constructor(private readonly configService: AppConfigService) {
		this.ai = new GoogleGenAI({ apiKey: this.configService.embedding.apiKey });
	}

	/**
	 * Векторизует батч текстов.
	 * Размер батча определяет вызывающая сторона (краулер).
	 * Возвращает массив векторов в том же порядке что и входные тексты.
	 */
	public async embedTexts(texts: string[]): Promise<number[][]> {
		const { model } = this.configService.embedding;

		this.logger.debug(`Embedding ${texts.length} texts`);

		const response = await this.ai.models.embedContent({
			model,
			contents: texts,
			config: { taskType: 'CLUSTERING' }
		});

		return response.embeddings.map(e => e.values);
	}
}

export { EmbeddingService };
