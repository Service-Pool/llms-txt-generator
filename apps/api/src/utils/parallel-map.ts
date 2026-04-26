export async function parallelMap<T, R>(items: T[], fn: (item: T, index: number) => Promise<R>, concurrency: number): Promise<R[]> {
	const results = Array<R>(items.length);
	const executing: Promise<void>[] = [];

	for (let i = 0; i < items.length; i++) {
		const index = i;
		const promise = fn(items[i], index)
			.then((result) => { results[index] = result; })
			.finally(() => { void executing.splice(executing.indexOf(promise), 1); });

		executing.push(promise);
		if (executing.length >= concurrency) await Promise.race(executing);
	}

	await Promise.all(executing);
	return results;
}
