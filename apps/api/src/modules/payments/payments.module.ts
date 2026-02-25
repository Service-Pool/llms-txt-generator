import { Module, forwardRef } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { OrdersModule } from '@/modules/orders/orders.module';
import { UsersModule } from '@/modules/users/users.module';
import { PaymentsController } from '@/modules/payments/controllers/payments.controller';
import { WebhookController } from '@/modules/payments/controllers/webhook.controller';
import { StripeService } from '@/modules/payments/services/stripe.service';
import { PaymentUserAuthValidator } from '@/validators/payment.validator';

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
