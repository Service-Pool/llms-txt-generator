/**
 * Error response message
 */
class MessageError {
	constructor(public readonly error: string) {}

	public toJSON(): string {
		return this.error;
	}

	public static fromJSON(json: unknown): MessageError {
		return new MessageError(json as string);
	}
}

export { MessageError };
