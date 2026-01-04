/**
 * Validation error response message
 */
class MessageInvalid {
	constructor(public readonly violations: string[]) {}

	public toJSON(): string[] {
		return this.violations;
	}

	public static fromJSON(json: unknown): MessageInvalid {
		return new MessageInvalid(json as string[]);
	}
}

export { MessageInvalid };
