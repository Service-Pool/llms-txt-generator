import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GenerationRequest } from '../modules/generations/entities/generation-request.entity';

@ValidatorConstraint({ async: true })
@Injectable()
class GenerationRequestValidator implements ValidatorConstraintInterface {
	constructor(@InjectRepository(GenerationRequest) private readonly generationRequestRepository: Repository<GenerationRequest>) { }

	public static validateGenerationRequestExists(validationOptions?: ValidationOptions) {
		return function (object: object, propertyName: string) {
			registerDecorator({
				target: object.constructor,
				propertyName,
				options: validationOptions,
				validator: GenerationRequestValidator
			});
		};
	}

	public async validate(requestId: number): Promise<boolean> {
		const request = await this.generationRequestRepository.findOneBy({ id: requestId });
		return request !== null;
	}
}

export { GenerationRequestValidator };
