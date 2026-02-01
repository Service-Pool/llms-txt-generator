import {
	Catch,
	ExceptionFilter,
	ArgumentsHost,
	HttpException,
	HttpStatus,
	Logger
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { ApiResponse } from '../utils/response/api-response';
import { ValidationException } from '../exceptions/validation.exception';
import { ResponseCode, resolveResponseCode } from '../enums/response-code.enum';

@Catch()
class GlobalExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(GlobalExceptionFilter.name);

	constructor() { }

	public catch(exception: unknown, host: ArgumentsHost): void {
		const response = host.switchToHttp().getResponse<FastifyReply>();

		if (exception instanceof ValidationException) {
			this.logger.warn(exception.getErrors().join('; '));

			response
				.status(HttpStatus.OK)
				.send(ApiResponse.invalid(exception.getErrors()));

			return;
		}

		if (exception instanceof HttpException) {
			const status = exception.getStatus();
			const code = resolveResponseCode(status);

			this.logger.warn(`${exception.constructor.name} (${status}): ${exception.message}`);

			response
				.status(status)
				.send(ApiResponse.error(code, exception.message));

			return;
		}

		const message
			= exception instanceof Error
				? exception.message
				: 'Internal server error';

		this.logger.error('Unhandled exception', exception);

		response
			.status(HttpStatus.INTERNAL_SERVER_ERROR)
			.send(ApiResponse.error(ResponseCode.ERROR, message));
	}
}

export { GlobalExceptionFilter };
