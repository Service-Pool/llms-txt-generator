import { ResponseCode } from '../../enums/response-code.enum';
import { ApiResponse } from './api-response';
import { MessageSuccess } from './message-success';
import { MessageInvalid } from './message-invalid';
import { MessageError } from './message-error';

/**
 * Abstract Response Builder
 */
abstract class AbstractResponse {
	/**
	 * Send a successful response
	 */
	public static success<T>(data: T): ApiResponse<MessageSuccess<T>> {
		return this.withMessage(ResponseCode.SUCCESS, new MessageSuccess(data));
	}

	/**
	 * Send a validation error (400) response
	 */
	public static invalid(errors: string[]): ApiResponse<MessageInvalid> {
		return this.withMessage(ResponseCode.INVALID, new MessageInvalid(errors));
	}

	/**
	 * Send a generic error response
	 */
	public static error(code: ResponseCode, error: string = 'Internal server error'): ApiResponse<MessageError> {
		return this.withMessage(code, new MessageError(error));
	}

	/**
	 * Help to standardize response structure
	 */
	private static withMessage<T>(code: ResponseCode, message: T): ApiResponse<T> {
		return new ApiResponse().setCode(code).setMessage(message) as ApiResponse<T>;
	}
}

export { AbstractResponse };
