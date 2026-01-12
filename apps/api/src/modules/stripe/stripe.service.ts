import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../config/config.service';
import Stripe from 'stripe';

@Injectable()
class StripeService {
	private readonly stripe: Stripe;

	constructor(private readonly configService: AppConfigService) {
		this.stripe = new Stripe(this.configService.stripe.secretKey, {
			apiVersion: '2025-12-15.clover'
		});
	}

	/**
	 * Создать Checkout Session для оплаты
	 */
	public async createCheckoutSession(params: {
		generationRequestId: number;
		amount: number;
		currency: string;
		hostname: string;
		provider: string;
	}): Promise<Stripe.Checkout.Session> {
		const { generationRequestId, amount, currency, hostname, provider } = params;

		const session = await this.stripe.checkout.sessions.create({
			mode: 'payment',
			line_items: [{
				price_data: {
					currency: currency.toLowerCase(),
					product_data: {
						name: `Text Generation for ${hostname}`,
						description: `Provider: ${provider}`
					},
					unit_amount: Math.round(amount * 100)
				},
				quantity: 1
			}],
			metadata: {
				generationRequestId: generationRequestId.toString()
			},
			success_url: `${this.configService.stripe.frontendHost}/generations?success=true`,
			cancel_url: `${this.configService.stripe.frontendHost}/generations?canceled=true`
		});

		return session;
	}

	/**
	 * Получить статус существующей Session
	 */
	public async retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session> {
		return this.stripe.checkout.sessions.retrieve(sessionId);
	}

	/**
	 * Проверить webhook подпись
	 */
	public constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
		return this.stripe.webhooks.constructEvent(
			payload,
			signature,
			this.configService.stripe.webhookSecret
		);
	}
}

export { StripeService };
