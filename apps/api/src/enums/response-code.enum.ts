import { HttpStatus } from '@nestjs/common/enums/http-status.enum';

enum ResponseCode {
	SUCCESS = 200,
	INVALID = 400,
	HANDLED_EXCEPTION = 4001,
	RATE_LIMIT_EXCEEDED = 429,
	ERROR = 500
}

const STATUS_TO_CODE: Record<number, ResponseCode> = {
	[HttpStatus.BAD_REQUEST]: ResponseCode.HANDLED_EXCEPTION,
	[HttpStatus.UNAUTHORIZED]: ResponseCode.HANDLED_EXCEPTION,
	[HttpStatus.FORBIDDEN]: ResponseCode.HANDLED_EXCEPTION,
	[HttpStatus.NOT_FOUND]: ResponseCode.HANDLED_EXCEPTION,
	[HttpStatus.CONFLICT]: ResponseCode.HANDLED_EXCEPTION,
	[HttpStatus.UNPROCESSABLE_ENTITY]: ResponseCode.HANDLED_EXCEPTION,
	[HttpStatus.TOO_MANY_REQUESTS]: ResponseCode.RATE_LIMIT_EXCEEDED
};

function resolveResponseCode(status: number): ResponseCode {
	return STATUS_TO_CODE[status] ?? ResponseCode.ERROR;
}

export { ResponseCode, HttpStatus, resolveResponseCode };
