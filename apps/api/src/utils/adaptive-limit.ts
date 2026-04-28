class AdaptiveLimit {
	private current: number;

	constructor(initial: number) {
		this.current = Math.max(1, initial);
	}

	get value(): number { return this.current; }

	onSuccess(): void {
		this.current++;
	}

	onError(): void {
		this.current = Math.max(1, Math.floor(this.current / 2));
	}
}

export { AdaptiveLimit };
