import {
	ValidationArguments,
	ValidatorConstraint,
	ValidatorConstraintInterface
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { OrdersService } from '../modules/orders/services/orders.service';

@Injectable()
@ValidatorConstraint({ async: true })
class OrderHasOutputValidator implements ValidatorConstraintInterface {
	constructor(private readonly ordersService: OrdersService) { }

	public async validate(orderId: number): Promise<boolean> {
		const order = await this.ordersService.getUserOrder(orderId);
		return order.output !== null && order.output.length > 0;
	}

	public defaultMessage(args: ValidationArguments): string {
		return `Output for order ${args.value} not available yet`;
	}
}

export { OrderHasOutputValidator };
