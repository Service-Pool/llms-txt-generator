import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { ApiResponse } from '../utils/response/api-response';
import { ValidationException } from '../exceptions/validation.exception';
import { ResponseCode } from '../enums/response-code.enum';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(GlobalExceptionFilter.name);

	constructor(private readonly apiResponse: ApiResponse) { }

	public catch(exception: unknown, host: ArgumentsHost): void {
		const response = host.switchToHttp().getResponse<FastifyReply>();

		let statusCode = ResponseCode.ERROR;
		let body: unknown;

		switch (true) {
			case exception instanceof ValidationException:
				this.logger.warn(exception.getErrors().join('; '));
				body = this.apiResponse.invalid(exception.getErrors());
				break;

			case exception instanceof HttpException: {
				statusCode = exception.getStatus();
				const exceptionResponse = exception.getResponse();
				const message = typeof exceptionResponse === 'object' && 'message' in exceptionResponse
					? exceptionResponse.message
					: exceptionResponse;

				this.logger.error(`HTTP exception (${statusCode}):`, message);
				body = this.apiResponse.error(ResponseCode.ERROR, String(message));
				break;
			}

			default: {
				const message = exception instanceof Error
					? exception.message
					: String(exception);
				this.logger.error('Unhandled exception:', exception instanceof Error ? exception.stack : exception);
				body = this.apiResponse.error(ResponseCode.ERROR, message);
				break;
			}
		}

		response.status(statusCode).send(body);
	}
}
