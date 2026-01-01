/**
 * Utility for generation job ID operations
 */
class JobIdUtil {
	private static readonly PREFIX = 'genId-';

	/**
	 * Generate job ID from generation ID
	 */
	public static generate(generationId: number): string {
		return `${this.PREFIX}${generationId}`;
	}

	/**
	 * Parse job ID to extract generation ID
	 * @returns generation ID or null if invalid format
	 */
	public static parse(jobId: string): number | null {
		if (!jobId.startsWith(this.PREFIX)) {
			return null;
		}

		const idStr = jobId.substring(this.PREFIX.length);
		const id = parseInt(idStr, 10);

		return isNaN(id) ? null : id;
	}
}

export { JobIdUtil };
