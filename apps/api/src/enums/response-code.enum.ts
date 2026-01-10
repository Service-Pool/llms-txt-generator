import { HttpStatus as _HttpStatus } from '@nestjs/common/enums/http-status.enum';

enum ResponseCode {
	SUCCESS = 200,
	INVALID = 400,
	ERROR = 500
}

export { ResponseCode };
