import {
	ValidationArguments,
	ValidatorConstraint,
	ValidatorConstraintInterface
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { SessionData } from '@/modules/auth/entities/session.entity';

@Injectable()
@ValidatorConstraint({ async: true })
class PaymentUserAuthValidator implements ValidatorConstraintInterface {
	constructor(private readonly clsService: ClsService) { }

	public validate(): boolean {
		const session = this.clsService.get<SessionData>('sessionData');

		if (!session?.userId) {
			return false;
		}

		return true;
	}

	public defaultMessage(_args: ValidationArguments): string {
		return 'Authentication required for payment operations';
	}
}

export { PaymentUserAuthValidator };
