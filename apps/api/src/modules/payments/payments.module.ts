import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsController } from './controllers/payments.controller';
import { StripeService } from './services/stripe.service';

@Module({
	imports: [OrdersModule],
	providers: [StripeService],
	controllers: [PaymentsController],
	exports: [StripeService]
})

export class PaymentsModule { }
