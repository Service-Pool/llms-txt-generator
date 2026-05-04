type FixedTask = () => Promise<void>;

/**
 * Fixed-concurrency queue — no AIMD, no retry.
 * Used for crawling where concurrency is a hard cap set by the operator,
 * and failures are handled by the caller as result objects (not exceptions).
 */
class FixedQueue {
	private readonly queue: FixedTask[] = [];
	private activeWorkers = 0;
	private readonly concurrency: number;

	constructor(opts: { concurrency: number }) {
		this.concurrency = opts.concurrency;
	}

	submit<T>(fn: () => Promise<T>): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			this.queue.push(async () => {
				try {
					resolve(await fn());
				} catch (err) {
					reject(err instanceof Error ? err : new Error(String(err)));
				}
			});
			this.drain();
		});
	}

	private drain(): void {
		while (this.activeWorkers < this.concurrency && this.queue.length > 0) {
			const task = this.queue.shift();
			if (!task) break;
			this.activeWorkers++;
			void this.runTask(task);
		}
	}

	private async runTask(task: FixedTask): Promise<void> {
		try {
			await task();
		} finally {
			this.activeWorkers--;
			this.drain();
		}
	}
}

export { FixedQueue };
