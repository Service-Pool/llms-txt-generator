import { ResponseCode } from '@api/shared';

class UIError extends Error {
	constructor(
		public readonly code: ResponseCode = ResponseCode.ERROR,
		public readonly message: string,
		public readonly context: string[] = []
	) {
		super(message);
		this.name = 'UIError';
	}
}

export { UIError };
