import { Deserializable } from './types';

/**
 * Success response message
 */
class MessageSuccess<T = unknown> {
	constructor(public readonly data: T) { }

	public toJSON(): T {
		return this.data;
	}

	public static fromJSON<T>(json: unknown, DataClass?: Deserializable<T>): MessageSuccess<T> {
		if (DataClass) {
			return new MessageSuccess(DataClass.fromJSON(json));
		}
		return new MessageSuccess(json as T);
	}
}

export { MessageSuccess };
