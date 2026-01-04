/**
 * Type for classes that can be deserialized from JSON
 */
type Deserializable<T> = {
	fromJSON(json: unknown): T;
};

export { type Deserializable };
