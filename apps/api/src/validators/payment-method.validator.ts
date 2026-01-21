import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { GenerationRequest } from '../modules/generations/entities/generation-request.entity';
import { Repository } from 'typeorm';

/**
 * Проверяет, что для GenerationRequest еще не создан метод оплаты Checkout
 */
@ValidatorConstraint({ async: true })
@Injectable()
class NoCheckoutSessionExistsValidator implements ValidatorConstraintInterface {
	private readonly logger = new Logger(NoCheckoutSessionExistsValidator.name);

	constructor(@InjectRepository(GenerationRequest) private readonly generationRequestRepository: Repository<GenerationRequest>) { }

	public static validateNoCheckoutSessionExists(validationOptions?: ValidationOptions) {
		return function (object: object, propertyName: string) {
			registerDecorator({
				target: object.constructor,
				propertyName,
				options: validationOptions,
				validator: NoCheckoutSessionExistsValidator
			});
		};
	}

	public async validate(requestId: number): Promise<boolean> {
		const request = await this.generationRequestRepository.findOne({
			where: { id: requestId },
			select: ['id', 'checkoutSessionUrl']
		});

		if (!request) {
			this.logger.warn(`Request not found: ${requestId}`);
			return false; // Request not found
		}

		// Валидация успешна если checkoutSessionUrl пустой
		return !request.checkoutSessionUrl;
	}
}

/**
 * Проверяет, что для GenerationRequest еще не создан метод оплаты Elements
 */
@ValidatorConstraint({ async: true })
@Injectable()
class NoPaymentIntentExistsValidator implements ValidatorConstraintInterface {
	private readonly logger = new Logger(NoPaymentIntentExistsValidator.name);

	constructor(@InjectRepository(GenerationRequest)
	private readonly generationRequestRepository: Repository<GenerationRequest>) { }

	public static validateNoPaymentIntentExists(validationOptions?: ValidationOptions) {
		return function (object: object, propertyName: string) {
			registerDecorator({
				target: object.constructor,
				propertyName,
				options: validationOptions,
				validator: NoPaymentIntentExistsValidator
			});
		};
	}

	public async validate(requestId: number): Promise<boolean> {
		const request = await this.generationRequestRepository.findOne({
			where: { id: requestId },
			select: ['id', 'paymentIntentClientSecret']
		});

		if (!request) {
			this.logger.warn(`Request not found: ${requestId}`);
			return false; // Request not found
		}

		// Валидация успешна если paymentIntentClientSecret пустой
		return !request.paymentIntentClientSecret;
	}
}

export { NoCheckoutSessionExistsValidator, NoPaymentIntentExistsValidator };
