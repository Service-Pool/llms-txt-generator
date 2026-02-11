import { ResponseCode } from '../../enums/response-code.enum';
import { type Deserializable } from './types';
import { getSchemaPath } from '@nestjs/swagger';

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

	private static readonly DEFAULT_SUCCESS_MESSAGE = 'Success';
	private static readonly DEFAULT_INVALID_MESSAGE = 'Request validation failed';
	private static readonly DEFAULT_ERROR_MESSAGE = 'Internal server error';

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
	public static success<T>(
		data: T,
		message: typeof ApiResponse.DEFAULT_SUCCESS_MESSAGE = ApiResponse.DEFAULT_SUCCESS_MESSAGE
	): ApiResponse<T> {
		const response = new ApiResponse<T>(ResponseCode.SUCCESS, message);
		response.data = data;
		return response;
	}

	/**
	 * Create validation error response
	 */
	public static invalid(
		violations: string[],
		message: typeof ApiResponse.DEFAULT_INVALID_MESSAGE = ApiResponse.DEFAULT_INVALID_MESSAGE
	): ApiResponse<never> {
		const response = new ApiResponse<never>(ResponseCode.INVALID, message);
		response.violations = violations;
		return response;
	}

	/**
	 * Create error response
	 */
	public static error(
		code: ResponseCode = ResponseCode.ERROR,
		message: typeof ApiResponse.DEFAULT_ERROR_MESSAGE = ApiResponse.DEFAULT_ERROR_MESSAGE
	): ApiResponse<never> {
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

	/**
	 * Generate OpenAPI schema for error responses
	 */
	public static getErrorSchema(
		code: ResponseCode,
		message: typeof ApiResponse.DEFAULT_SUCCESS_MESSAGE
			| typeof ApiResponse.DEFAULT_INVALID_MESSAGE
			| typeof ApiResponse.DEFAULT_ERROR_MESSAGE
	) {
		const baseSchema = {
			type: 'object' as const,
			properties: {
				code: {
					type: 'number' as const,
					enum: Object.entries(ResponseCode),
					example: code
				},
				message: { type: 'string' as const, example: message }
			} as Record<string, unknown>,
			required: ['code', 'message']
		};

		// Добавляем violations только для validation errors
		if (code === ResponseCode.INVALID) {
			baseSchema.properties.violations = {
				type: 'array' as const,
				items: { type: 'string' as const },
				example: ['Field name is required', 'Email must be valid']
			};
			baseSchema.required = [...baseSchema.required, 'violations'];
		}

		return baseSchema;
	}

	/**
	 * Generate OpenAPI schema for success responses
	 */
	public static getSuccessSchema(
		dtoClass?: new (...args: unknown[]) => object,
		isArray: boolean = false,
		message: string = ApiResponse.DEFAULT_SUCCESS_MESSAGE
	) {
		const dataSchema = dtoClass
			? isArray
				? { type: 'array' as const, items: { $ref: getSchemaPath(dtoClass) } }
				: { $ref: getSchemaPath(dtoClass) }
			: { type: 'null' as const, example: null };

		return {
			type: 'object' as const,
			properties: {
				code: {
					type: 'number' as const,
					example: ResponseCode.SUCCESS
				},
				message: {
					type: 'string' as const,
					example: message
				},
				data: dataSchema
			},
			required: ['code', 'message', 'data']
		};
	}
}

export { ApiResponse };
