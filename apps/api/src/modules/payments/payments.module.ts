import { Module, forwardRef } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { UsersModule } from '../users/users.module';
import { PaymentsController } from './controllers/payments.controller';
import { StripeService } from './services/stripe.service';

@Module({
	imports: [
		forwardRef(() => OrdersModule),
		UsersModule
	],
	providers: [StripeService],
	controllers: [PaymentsController],
	exports: [StripeService]
})

export class PaymentsModule { }
