import { HttpException, HttpStatus } from '@nestjs/common';
import { ValidationError } from 'class-validator';

class ValidationException extends HttpException {
	constructor(public readonly validationErrors: ValidationError[], message = 'Validation failed') {
		super(message, HttpStatus.BAD_REQUEST);
	}

	getErrors(): string[] {
		return this.validationErrors.flatMap(error =>
			Object.values(error.constraints || {})).filter(msg => msg.length > 0);
	}
}

export { ValidationException };
