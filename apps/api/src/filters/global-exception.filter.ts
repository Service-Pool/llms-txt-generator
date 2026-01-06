import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { ApiResponse } from '../utils/response/api-response';
import { ValidationException } from '../exceptions/validation.exception';
import { ResponseCode } from '../enums/response-code.enum';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
	constructor(private readonly apiResponse: ApiResponse) { }

	public catch(exception: unknown, host: ArgumentsHost): void {
		const response = host.switchToHttp().getResponse<FastifyReply>();

		let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
		let body: unknown;

		switch (true) {
			case exception instanceof ValidationException:
				// Validation errors - HTTP 200 with code 400 in body
				statusCode = HttpStatus.OK;
				body = this.apiResponse.invalid(exception.getErrors());
				break;

			case exception instanceof HttpException: {
				statusCode = exception.getStatus();
				const exceptionResponse = exception.getResponse();
				const message = typeof exceptionResponse === 'object' && 'message' in exceptionResponse
					? exceptionResponse.message
					: exceptionResponse;

				body = this.apiResponse.error(exceptionResponse.statusCode, String(message));
				break;
			}

			default:
				body = this.apiResponse.error(ResponseCode.ERROR);
				break;
		}

		response.status(statusCode).send(body);
	}
}
