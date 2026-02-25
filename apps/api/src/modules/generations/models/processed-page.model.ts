/**
 * Результат обработки страницы
 * Использует паттерн Factory для создания только валидных состояний
 */
class ProcessedPage {
	private constructor(
		private readonly _url: string,
		private readonly _title: string,
		private readonly _content: string,
		private _summary: string | null = null,
		private _error: string | null = null
	) { }

	public static success(url: string, title: string, content: string, summary?: string): ProcessedPage {
		return new ProcessedPage(url, title, content, summary ?? null, null);
	}

	public static failure(url: string, error: string): ProcessedPage {
		return new ProcessedPage(url, '', '', null, error);
	}

	get url(): string {
		return this._url;
	}

	get title(): string {
		return this._title;
	}

	get content(): string {
		return this._content;
	}

	get summary(): string | null {
		return this._summary;
	}

	set summary(value: string) {
		this._summary = value;
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

export { ProcessedPage };
