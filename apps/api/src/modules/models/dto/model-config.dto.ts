interface ModelOptions {
	apiKey?: string;
	baseUrl?: string;
	temperature: number;
	maxTokens: number;
}

class ModelConfigDto {
	constructor(
		public id: string,
		public category: string,
		public displayName: string,
		public description: string,
		public serviceClass: string,
		public modelName: string,
		public baseRate: number,
		public pageLimit: number | false,
		public queueName: string,
		public queueType: 'local' | 'cloud',
		public batchSize: number,
		public options: ModelOptions,
		public enabled: boolean = true
	) { }
}

export { ModelConfigDto };
