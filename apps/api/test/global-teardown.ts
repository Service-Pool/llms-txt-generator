export default async function globalTeardown() {
	// Force garbage collection if available
	if (global.gc) {
		global.gc();
	}

	// Give a small amount of time for any lingering promises
	await new Promise(resolve => setTimeout(resolve, 100));
}
