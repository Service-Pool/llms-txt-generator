import { ResponseCode } from '../../enums/response-code.enum';
import { Injectable } from '@nestjs/common';
import { AbstractResponse } from './abstract-response';
import { MessageSuccess } from './message-success';
import { MessageInvalid } from './message-invalid';
import { MessageError } from './message-error';
import { type Deserializable } from './types';

/**
 * API Response class
 * Used on both backend (with DI) and frontend (for deserialization)
 *
 * All syntax must be compartible with ES6
 */
@Injectable()
class ApiResponse<T = unknown> extends AbstractResponse {
	private declare code: ResponseCode;
	private declare message: T;

	constructor() {
		super();
	}

	public getСode(): ResponseCode {
		return this.code;
	}

	public getMessage(): T {
		return this.message;
	}

	public setCode(code: ResponseCode): this {
		this.code = code;
		return this;
	}

	public setMessage(message: T): this {
		this.message = message;
		return this;
	}

	public static fromJSON<T>(
		json: { code: ResponseCode; message: unknown },
		DataClass?: Deserializable<T>
	): ApiResponse<MessageSuccess<T> | MessageInvalid | MessageError> {
		const { code, message } = json;
		const response = new ApiResponse<MessageSuccess<T> | MessageInvalid | MessageError>();

		switch (code) {
			case ResponseCode.SUCCESS:
				return response.setCode(code).setMessage(MessageSuccess.fromJSON(message, DataClass));

			case ResponseCode.INVALID:
				return response.setCode(code).setMessage(MessageInvalid.fromJSON(message));

			case ResponseCode.ERROR:
				return response.setCode(code).setMessage(MessageError.fromJSON(message));

			default:
				throw new Error(`Invalid response code: ${code as number}`);
		}
	}
}

export { ApiResponse };
