import { Currency } from '@/enums/currency.enum';

interface AiModelOptions {
	apiKey?: string;
	baseUrl?: string;
	temperature: number;
	maxTokens: number;
	/** Maximum LLM concurrency. null = unlimited (paid models). */
	maxLlmConcurrency: number | null;
	/** Maximum pages per summary batch. */
	maxSummaryBatchSize: number;
}

/**
 * AI Model Configuration Entity
 * Currently loaded from config file, prepared for database migration
 *
 * To migrate to database:
 * 1. Add @Entity('ai_model_configs') decorator
 * 2. Add column decorators (@PrimaryColumn, @Column)
 * 3. Remove custom repository and use TypeORM repository
 */
class AiModelConfig {
	id: string;
	baseRate: number;
	category: string;
	currency: Currency;
	description: string;
	displayName: string;
	enabled: boolean;
	modelName: string;
	options: AiModelOptions;
	pageLimit: number | false;
	queueName: string;
	queueType: 'local' | 'cloud';
	serviceClass: string;
}

export { AiModelConfig, AiModelOptions };
