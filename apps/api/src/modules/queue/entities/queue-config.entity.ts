/**
 * Queue Configuration Entity
 * Defines worker settings (concurrency, lock duration, stalled interval) for each queue
 */
class QueueConfig {
	/**
	 * Unique queue name (e.g., 'gemini-queue', 'ollama-queue')
	 */
	name: string;

	/**
	 * Queue type: local (on-premise) or cloud (external API)
	 */
	type: 'local' | 'cloud';

	/**
	 * Number of jobs processed concurrently by worker
	 */
	concurrency: number;

	/**
	 * Maximum time (ms) a job can be locked by a worker
	 * If exceeded, job is considered stalled and can be picked up by another worker
	 */
	lockDuration: number;

	/**
	 * Interval (ms) to check for stalled jobs
	 */
	stalledInterval: number;
}

export { QueueConfig };
