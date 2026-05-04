import { Logger } from '@nestjs/common';

const MAX_ATTEMPTS = 16;
const LLM_TIMEOUT_MS = 300000; // 5 minutes

type ErrorKind = '429' | '503' | 'timeout' | 'other';

interface AimdTask {
	fn: () => Promise<unknown>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	resolve: (value: any) => void;
	reject: (reason: unknown) => void;
	attempt: number;
}

/**
 * Queue with AIMD concurrency control.
 *
 * Concurrency starts at 1 and grows +1 after a full "round" of successes
 * (successStreak >= concurrency). Drops to floor(concurrency/2) on any
 * rate-limit or transient error.
 *
 * Retry model: on a retryable failure the slot is released first, then the
 * task is re-enqueued at the FRONT of the queue after the delay so it is not
 * starved behind hundreds of new tasks. No slot is held across the sleep.
 */
class AimdQueue {
	private readonly queue: AimdTask[] = [];
	private activeWorkers = 0;
	private concurrency = 1;
	private successStreak = 0;
	private readonly maxConcurrency: number | null;
	private readonly timeoutMs: number | null;
	private readonly logger: Logger;
	private readonly label: string;

	constructor(opts: {
		maxConcurrency: number | null;
		timeoutMs: number | null;
		label: string;
		logger: Logger;
	}) {
		this.maxConcurrency = opts.maxConcurrency;
		this.timeoutMs = opts.timeoutMs;
		this.label = opts.label;
		this.logger = opts.logger;
	}

	submit<T>(fn: () => Promise<T>): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const task: AimdTask = { fn, resolve, reject, attempt: 1 };
			this.enqueue(task, false);
		});
	}

	private enqueue(task: AimdTask, priority: boolean): void {
		if (priority) {
			this.queue.unshift(task);
		} else {
			this.queue.push(task);
		}
		this.drain();
	}

	private drain(): void {
		while (this.activeWorkers < this.concurrency && this.queue.length > 0) {
			const task = this.queue.shift();
			if (!task) break;
			this.activeWorkers++;
			void this.runTask(task);
		}
	}

	private async runTask(task: AimdTask): Promise<void> {
		try {
			const timeoutMs = this.timeoutMs;
			const fn = timeoutMs !== null
				? () => AimdQueue.withTimeout(task.fn, timeoutMs, this.label)
				: task.fn;
			const result = await fn();
			this.onSuccess();
			task.resolve(result);
		} catch (err) {
			const kind = AimdQueue.classifyError(err);

			if (kind === 'other' || task.attempt >= MAX_ATTEMPTS) {
				task.reject(err);
			} else {
				this.onRateLimit(kind);
				this.activeWorkers--;
				this.drain();

				const delay = AimdQueue.calcDelay(kind, task.attempt, err);
				this.logger.warn(`${this.label}: ${kind} attempt ${task.attempt}/${MAX_ATTEMPTS}, retrying in ${Math.round(delay)}ms`);

				setTimeout(() => {
					this.enqueue({ ...task, attempt: task.attempt + 1 }, true);
				}, delay);

				return;
			}
		}

		this.activeWorkers--;
		this.drain();
	}

	private onSuccess(): void {
		this.successStreak++;
		if (this.successStreak >= this.concurrency) {
			const next = this.concurrency + 1;
			this.concurrency = this.maxConcurrency !== null ? Math.min(next, this.maxConcurrency) : next;
			this.successStreak = 0;
			this.logger.debug(`${this.label}: AIMD increase → concurrency=${this.concurrency}`);
		}
	}

	private onRateLimit(kind: ErrorKind): void {
		const prev = this.concurrency;
		this.concurrency = Math.max(Math.floor(this.concurrency / 2), 1);
		this.successStreak = 0;
		this.logger.warn(`${this.label}: AIMD decrease (${kind}) → concurrency=${this.concurrency} (was ${prev})`);
	}

	private static classifyError(err: unknown): ErrorKind {
		const status = (err as Record<string, unknown>)?.status as number | undefined
			?? ((err as Record<string, unknown>)?.error as Record<string, unknown>)?.code as number | undefined;
		if (status === 429) return '429';
		if (status === 503) return '503';
		const msg = String((err as Error)?.message ?? '');
		if (msg.includes('timeout') || msg.includes('timed out')) return 'timeout';
		if (status !== undefined && status >= 500) return '503';
		return 'other';
	}

	private static extractRetryDelayMs(err: unknown): number {
		const errObj = err as Record<string, unknown>;
		const details = (errObj?.error as Record<string, unknown>)?.details as Record<string, unknown>[] | undefined;
		const retryInfo = details?.find(d => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo');
		const retryDelayStr = retryInfo?.['retryDelay'] as string | undefined;
		if (retryDelayStr) {
			const parsed = parseFloat(retryDelayStr);
			if (!isNaN(parsed)) return parsed * 1000;
		}
		const retryAfter = (errObj?.headers as Record<string, string> | undefined)?.['retry-after']
			?? (errObj?.response as Record<string, unknown> | undefined)?.['retry-after'] as string | undefined;
		if (retryAfter) {
			const parsed = parseFloat(retryAfter);
			if (!isNaN(parsed)) return parsed * 1000;
		}
		return 15000;
	}

	private static calcDelay(kind: ErrorKind, attempt: number, err: unknown): number {
		const jitter = Math.random() * 2000 * attempt;
		if (kind === '429') return AimdQueue.extractRetryDelayMs(err) + jitter;
		return Math.min(3000 * Math.pow(2, attempt - 1), 60000) + jitter;
	}

	private static toMessage(e: unknown): string {
		if (e == null) return e === null ? 'null' : 'undefined';
		if (typeof e !== 'object') return (e as string | number | boolean | bigint | symbol).toString();
		return JSON.stringify(e);
	}

	private static withTimeout<T>(fn: () => Promise<T>, ms: number, label: string): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const timer = setTimeout(
				() => { reject(new Error(`${label} timed out after ${ms}ms`)); },
				ms
			);
			let p: Promise<T>;
			try {
				p = fn();
			} catch (e) {
				clearTimeout(timer);
				reject(e instanceof Error ? e : new Error(String(e)));
				return;
			}
			p.then(
				(v) => {
					clearTimeout(timer);
					resolve(v);
				},
				(e: unknown) => {
					clearTimeout(timer);
					reject(e instanceof Error ? e : new Error(AimdQueue.toMessage(e)));
				}
			);
		});
	}
}

export { AimdQueue, LLM_TIMEOUT_MS };
