interface CacheEntry {
	title: string | null;
	summary: string | null;
	text: string;
	vector: number[] | null;
	embeddingModel: string | null;
}

export { CacheEntry };
