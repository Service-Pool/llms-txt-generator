import {
	ValidationArguments,
	ValidatorConstraint,
	ValidatorConstraintInterface
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { OrdersService } from '../modules/orders/services/orders.service';
import { OrderStatusMachine } from '../modules/orders/utils/order-status-machine';

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

@Injectable()
@ValidatorConstraint({ async: true })
class OrderCanBeDeletedValidator implements ValidatorConstraintInterface {
	constructor(private readonly ordersService: OrdersService) { }

	public async validate(orderId: number): Promise<boolean> {
		const order = await this.ordersService.getUserOrder(orderId);

		// Check status using state machine
		if (!OrderStatusMachine.canBeDeleted(order.status)) {
			return false;
		}

		return true;
	}

	public defaultMessage(args: ValidationArguments): string {
		return `Order ${args.value} cannot be deleted (not found, already deleted, or in processing)`;
	}
}

export { OrderHasOutputValidator, OrderCanBeDeletedValidator };
