import {
	ValidationArguments,
	ValidatorConstraint,
	ValidatorConstraintInterface
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { AiModelsConfigService } from '../modules/ai-models/services/ai-models-config.service';

@Injectable()
@ValidatorConstraint({ async: false })
class AiModelValidator implements ValidatorConstraintInterface {
	constructor(private readonly aiModelsConfigService: AiModelsConfigService) { }

	public validate(modelId: string): boolean {
		try {
			const model = this.aiModelsConfigService.getModelById(modelId);
			return !!model;
		} catch {
			return false;
		}
	}

	public defaultMessage(args: ValidationArguments): string {
		return `Model '${args.value}' not found or not enabled`;
	}
}

export { AiModelValidator };
