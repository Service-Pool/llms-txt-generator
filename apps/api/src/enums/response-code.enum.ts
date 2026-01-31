import { HttpStatus } from '@nestjs/common/enums/http-status.enum';

enum ResponseCode {
	SUCCESS = 200,
	INVALID = 400,
	ERROR = 500
}

const STATUS_TO_CODE: Record<number, ResponseCode> = {
	[HttpStatus.BAD_REQUEST]: ResponseCode.INVALID,
	[HttpStatus.UNAUTHORIZED]: ResponseCode.INVALID,
	[HttpStatus.FORBIDDEN]: ResponseCode.INVALID,
	[HttpStatus.NOT_FOUND]: ResponseCode.INVALID,
	[HttpStatus.CONFLICT]: ResponseCode.INVALID,
	[HttpStatus.UNPROCESSABLE_ENTITY]: ResponseCode.INVALID
};

function resolveResponseCode(status: number): ResponseCode {
	return STATUS_TO_CODE[status] ?? ResponseCode.ERROR;
}

export { ResponseCode, HttpStatus, resolveResponseCode };
