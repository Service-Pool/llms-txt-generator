import { Module, forwardRef } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { OrdersModule } from '../orders/orders.module';
import { UsersModule } from '../users/users.module';
import { PaymentsController } from './controllers/payments.controller';
import { StripeService } from './services/stripe.service';
import { PaymentUserAuthValidator } from '../../validators/payment.validator';

@Module({
	imports: [
		ClsModule,
		forwardRef(() => OrdersModule),
		UsersModule
	],
	providers: [StripeService, PaymentUserAuthValidator],
	controllers: [PaymentsController],
	exports: [StripeService]
})

export class PaymentsModule { }
