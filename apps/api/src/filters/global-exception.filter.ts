import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { ApiResponse } from '../utils/response/api-response';
import { ValidationException } from '../exceptions/validation.exception';
import { ResponseCode } from '../enums/response-code.enum';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(GlobalExceptionFilter.name);

	constructor(private readonly apiResponse: ApiResponse) { }

	public catch(exception: unknown, host: ArgumentsHost): void {
		this.logger.error('Exception caught:', exception instanceof Error ? exception.stack : exception);

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

				body = this.apiResponse.error(statusCode, String(message));
				break;
			}

			default: {
				const _message = exception instanceof Error
					? exception.message
					: String(exception);
				body = this.apiResponse.error(ResponseCode.INTERNAL_SERVER_ERROR);
				break;
			}
		}

		response.status(statusCode).send(body);
	}
}
