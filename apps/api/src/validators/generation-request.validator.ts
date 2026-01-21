import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GenerationRequest } from '../modules/generations/entities/generation-request.entity';
import { ClsService } from 'nestjs-cls';
import { type UserClsStore } from '../modules/auth/models/user-context.model';

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

/**
 * Проверяет, что GenerationRequest принадлежит текущему пользователю
 */
@ValidatorConstraint({ async: true })
@Injectable()
class GenerationRequestOwnershipValidator implements ValidatorConstraintInterface {
	constructor(
		@InjectRepository(GenerationRequest) private readonly generationRequestRepository: Repository<GenerationRequest>,
		private readonly cls: ClsService<UserClsStore>
	) { }

	public static validateOwnership(validationOptions?: ValidationOptions) {
		return function (object: object, propertyName: string) {
			registerDecorator({
				target: object.constructor,
				propertyName,
				options: validationOptions,
				validator: GenerationRequestOwnershipValidator
			});
		};
	}

	public async validate(requestId: number): Promise<boolean> {
		const generationRequest = await this.generationRequestRepository.findOne({
			where: { id: requestId }
		});

		if (!generationRequest) {
			return true; // Пропускаем проверку, за существование отвечает другой валидатор
		}

		const userId = this.cls.get('userId');
		const sessionId = this.cls.get('sessionId');

		return userId
			? generationRequest.userId === userId
			: generationRequest.sessionId === sessionId;
	}
}

export { GenerationRequestValidator, GenerationRequestOwnershipValidator };
