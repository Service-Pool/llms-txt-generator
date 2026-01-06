import { HttpStatus } from '@nestjs/common/enums/http-status.enum';
import { ResponseCode } from '../../enums/response-code.enum';
import { ApiResponse } from './api-response';
import { MessageSuccess } from './message-success';
import { MessageInvalid } from './message-invalid';
import { MessageError } from './message-error';

/**
 * Abstract Response Builder
 */
abstract class AbstractResponse {
	protected apiResponse: ApiResponse<unknown>;

	/**
	 * Send a successful response
	 */
	public success<T>(data: T): ApiResponse<MessageSuccess<T>> {
		return this.withMessage(ResponseCode.SUCCESS, new MessageSuccess(data));
	}

	/**
	 * Send a validation error (400) response
	 */
	public invalid(errors: string[]): ApiResponse<MessageInvalid> {
		return this.withMessage(ResponseCode.INVALID, new MessageInvalid(errors));
	}

	/**
	 * Send a generic error response
	 */
	public error(code: ResponseCode | HttpStatus, error: string = 'Internal server error'): ApiResponse<MessageError> {
		return this.withMessage(code, new MessageError(error));
	}

	/**
	 * Help to standardize response structure
	 */
	private withMessage<T>(code: ResponseCode | HttpStatus, message: T): ApiResponse<T> {
		this.apiResponse = new ApiResponse().setCode(code).setMessage(message);
		return this.apiResponse as ApiResponse<T>;
	}
}

export { AbstractResponse };
