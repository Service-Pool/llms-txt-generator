import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../../config/config.service';
import Stripe from 'stripe';

@Injectable()
class StripeService {
	private readonly logger = new Logger(StripeService.name);
	private readonly stripe: Stripe;

	constructor(private readonly configService: AppConfigService) {
		const apiKey = this.configService.stripe.secretKey;

		this.stripe = new Stripe(apiKey, {
			apiVersion: '2025-12-15.clover'
		});
	}

	/**
	 * Создаёт Stripe Checkout Session для оплаты
	 * Используется для редиректа пользователя на страницу оплаты Stripe
	 */
	async createCheckoutSession(orderId: number, amount: number, currency: string, successUrl: string, cancelUrl: string): Promise<string> {
		try {
			// Валидация redirect URLs
			this.validateRedirectUrl(successUrl);
			this.validateRedirectUrl(cancelUrl);

			const session = await this.stripe.checkout.sessions.create({
				payment_method_types: ['card'],
				line_items: [
					{
						price_data: {
							currency,
							product_data: {
								name: `LLMs.txt Generation - Order #${orderId}`,
								description: 'AI-powered content summarization service'
							},
							unit_amount: Math.round(amount * 100) // Stripe expects amount in cents
						},
						quantity: 1
					}
				],
				mode: 'payment',
				success_url: successUrl,
				cancel_url: cancelUrl,
				metadata: {
					orderId: orderId.toString()
				}
			});

			this.logger.log(`Created Checkout Session ${session.id} for Order ${orderId}`);

			return session.id;
		} catch (error) {
			this.logger.error(
				`Failed to create Checkout Session for Order ${orderId}:`,
				error
			);
			throw new Error(`Stripe Checkout Session creation failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Создаёт Payment Intent для встроенной формы оплаты
	 * Возвращает client_secret для инициализации Stripe Elements
	 */
	async createPaymentIntent(
		orderId: number,
		amount: number,
		currency: string = 'usd'
	): Promise<string> {
		try {
			const paymentIntent = await this.stripe.paymentIntents.create({
				amount: Math.round(amount * 100), // Stripe expects amount in cents
				currency,
				metadata: {
					orderId: orderId.toString()
				},
				automatic_payment_methods: {
					enabled: true
				}
			});

			this.logger.log(`Created Payment Intent ${paymentIntent.id} for Order ${orderId}`);

			return paymentIntent.client_secret;
		} catch (error) {
			this.logger.error(
				`Failed to create Payment Intent for Order ${orderId}:`,
				error
			);
			throw new Error(`Stripe Payment Intent creation failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Проверяет статус Checkout Session
	 * Используется для polling состояния оплаты
	 */
	async checkSessionStatus(sessionId: string): Promise<'complete' | 'open' | 'expired'> {
		try {
			const session = await this.stripe.checkout.sessions.retrieve(sessionId);

			if (session.status === 'complete') {
				return 'complete';
			} else if (session.status === 'open') {
				return 'open';
			} else {
				return 'expired';
			}
		} catch (error) {
			this.logger.error(
				`Failed to check Session status ${sessionId}:`,
				error
			);
			throw new Error(`Stripe Session status check failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Создаёт возврат средств (refund)
	 * Используется при FAILED или по запросу пользователя
	 */
	async createRefund(paymentIntentId: string): Promise<void> {
		try {
			const refund = await this.stripe.refunds.create({
				payment_intent: paymentIntentId
			});

			this.logger.log(`Created Refund ${refund.id} for Payment Intent ${paymentIntentId}`);
		} catch (error) {
			this.logger.error(
				`Failed to create Refund for Payment Intent ${paymentIntentId}:`,
				error
			);
			throw new Error(`Stripe Refund creation failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Валидирует redirect URL против whitelist доменов
	 * Если allowedDomains содержит '*', разрешает любые HTTPS URL
	 */
	private validateRedirectUrl(url: string): void {
		const allowedDomains = this.configService.allowedDomains;

		// Если в whitelist есть '*', разрешаем любые HTTPS URLs
		if (allowedDomains.includes('*')) {
			try {
				const urlObj = new URL(url);
				if (urlObj.protocol !== 'https:' && urlObj.protocol !== 'http:') {
					throw new Error('Only HTTP(S) URLs are allowed');
				}
				return;
			} catch (error) {
				throw new Error(`Invalid redirect URL: ${error instanceof Error ? error.message : String(error)}`);
			}
		}

		// Проверка против whitelist
		const isAllowed = allowedDomains.some((domain: string) => url.startsWith(domain));
		if (!isAllowed) {
			throw new Error(`Redirect URL ${url} is not allowed. Allowed domains: ${allowedDomains.join(', ')}`);
		}
	}

	/**
	 * Верифицирует webhook signature от Stripe
	 * Используется для безопасной обработки webhook событий
	 */
	constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
		const webhookSecret = this.configService.stripe.webhookSecret;
		if (!webhookSecret) {
			throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
		}

		try {
			return this.stripe.webhooks.constructEvent(
				payload,
				signature,
				webhookSecret
			);
		} catch (error) {
			this.logger.error('Webhook signature verification failed:', error);
			throw new Error(`Webhook verification failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
}

export { StripeService };
