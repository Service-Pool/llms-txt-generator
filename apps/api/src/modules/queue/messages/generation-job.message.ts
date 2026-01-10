import { Provider } from '../../../enums/provider.enum';

class GenerationJobMessage {
	constructor(
		public readonly generationId: number,
		public readonly requestId: number,
		public readonly provider: Provider
	) {}
}

export { GenerationJobMessage };
