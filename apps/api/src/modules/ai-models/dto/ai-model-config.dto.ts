import { Currency } from '../../../enums/currency.enum';

interface AiModelOptions {
	apiKey?: string;
	baseUrl?: string;
	temperature: number;
	maxTokens: number;
}

class AiModelConfigDto {
	constructor(
		public id: string,
		public category: string,
		public currency: Currency,
		public displayName: string,
		public description: string,
		public serviceClass: string,
		public modelName: string,
		public baseRate: number,
		public pageLimit: number | false,
		public queueName: string,
		public queueType: 'local' | 'cloud',
		public batchSize: number,
		public options: AiModelOptions,
		public enabled: boolean = true
	) { }
}

export { AiModelConfigDto };
