import { Module, forwardRef } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { OrdersModule } from '../orders/orders.module';
import { UsersModule } from '../users/users.module';
import { PaymentsController } from './controllers/payments.controller';
import { WebhookController } from './controllers/webhook.controller';
import { StripeService } from './services/stripe.service';
import { PaymentUserAuthValidator } from '../../validators/payment.validator';

@Module({
	imports: [
		ClsModule,
		forwardRef(() => OrdersModule),
		UsersModule
	],
	providers: [StripeService, PaymentUserAuthValidator],
	controllers: [PaymentsController, WebhookController],
	exports: [StripeService]
})

export class PaymentsModule { }
