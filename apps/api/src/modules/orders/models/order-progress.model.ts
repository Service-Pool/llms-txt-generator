interface OrderProgress {
	step: 'Crawling' | 'Vectorizing' | 'Clustering' | 'Generating' | 'Assembling';
	attempt: number;
	processedUrls: number | null;
	clusterCurrent: number | null;
	clusterTotal: number | null;
	pageCurrent: number | null;
	pageTotal: number | null;
}

export { OrderProgress };
