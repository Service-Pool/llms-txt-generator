class ClusterPage {
	private constructor(
		private readonly _path: string,
		private readonly _title: string,
		private readonly _text: string,
		private readonly _error: string | null = null
	) {}

	public static success(path: string, title: string, text: string): ClusterPage {
		return new ClusterPage(path, title, text, null);
	}

	public static failure(path: string, error: string): ClusterPage {
		return new ClusterPage(path, '', '', error);
	}

	get path(): string {
		return this._path;
	}

	get title(): string {
		return this._title;
	}

	get text(): string {
		return this._text;
	}

	get error(): string | null {
		return this._error;
	}

	public isSuccess(): boolean {
		return this._error === null;
	}

	public isFailure(): boolean {
		return this._error !== null;
	}
}

export { ClusterPage };
