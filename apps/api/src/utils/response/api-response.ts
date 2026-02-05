import { ResponseCode } from '../../enums/response-code.enum';
import { type Deserializable } from './types';

/**
 * API Response class
 * Used on both backend (with DI) and frontend (for deserialization)
 *
 * All syntax must be compatible with ES6
 */
class ApiResponse<T = unknown> {
	private code: ResponseCode;
	private message: string;
	private data: T;
	private violations: string[];

	private constructor(code: ResponseCode, message: string) {
		this.code = code;
		this.message = message;
	}

	public getСode(): ResponseCode {
		return this.code;
	}

	public getMessage(): string {
		return this.message;
	}

	public getData(): T {
		return this.data;
	}

	public getViolations(): string[] {
		return this.violations;
	}

	/**
	 * Create successful response
	 */
	public static success<T>(data: T, message: string = 'Success'): ApiResponse<T> {
		const response = new ApiResponse<T>(ResponseCode.SUCCESS, message);
		response.data = data;
		return response;
	}

	/**
	 * Create validation error response
	 */
	public static invalid(violations: string[], message: string = 'Request validation failed'): ApiResponse<never> {
		const response = new ApiResponse<never>(ResponseCode.INVALID, message);
		response.violations = violations;
		return response;
	}

	/**
	 * Create error response
	 */
	public static error(code: ResponseCode = ResponseCode.ERROR, message: string = 'Internal server error'): ApiResponse<never> {
		return new ApiResponse<never>(code, message);
	}

	/**
	 * Deserialize from JSON
	 */
	public static fromJSON<T>(json: ApiResponse<unknown>, DataClass?: Deserializable<T>): ApiResponse<T> {
		const response = new ApiResponse<T>(json.code, json.message);
		response.violations = json.violations;

		if (json.data !== undefined) {
			response.data = DataClass ? DataClass.fromJSON(json.data) : (json.data as T);
		}

		return response;
	}
}

export { ApiResponse };
