class GenerationProgressEvent {
	constructor(
		public readonly generationId: number,
		public readonly status: string,
		public readonly processedUrls: number,
		public readonly totalUrls: number
	) {}
}

class GenerationStatusEvent {
	constructor(
		public readonly generationId: number,
		public readonly status: string,
		public readonly content?: string,
		public readonly errorMessage?: string,
		public readonly entriesCount?: number
	) {}
}

export { GenerationProgressEvent, GenerationStatusEvent };
