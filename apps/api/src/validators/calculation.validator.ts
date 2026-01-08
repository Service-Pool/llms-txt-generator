import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { Injectable } from '@nestjs/common';
import { CalculationsService } from '../modules/calculations/calculations.service';

@ValidatorConstraint({ async: true })
@Injectable()
class CalculationValidator implements ValidatorConstraintInterface {
	constructor(private readonly calculationsService: CalculationsService) { }

	public static validateCalculationExists(validationOptions?: ValidationOptions) {
		return function (object: object, propertyName: string) {
			registerDecorator({
				target: object.constructor,
				propertyName,
				options: validationOptions,
				validator: CalculationValidator
			});
		};
	}

	public async validate(hostname: string): Promise<boolean> {
		try {
			const { calculation } = await this.calculationsService.findOrCreateCalculation(hostname);
			return calculation !== null;
		} catch {
			return false;
		}
	}
}

export { CalculationValidator };
