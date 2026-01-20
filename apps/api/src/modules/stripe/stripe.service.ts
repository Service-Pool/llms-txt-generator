import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../config/config.service';
import { GenerationRequestStatus, type GenerationRequestStatusValue } from '../../enums/generation-request-status.enum';
import { StripePaymentMethod } from '../../enums/stripe-payment-method.enum';
import { StripePaymentStatus } from '../../enums/stripe-payment-status.enum';
import { StripeSessionStatus } from '../../enums/stripe-session-status.enum';
import { PaymentLinkDtoResponse } from '../generations/dto/generation-response.dto';
import Stripe from 'stripe';

@Injectable()
class StripeService {
	private readonly logger = new Logger(StripeService.name);
	private readonly stripe: Stripe;

	constructor(private readonly configService: AppConfigService) {
		this.stripe = new Stripe(this.configService.stripe.secretKey, {
			apiVersion: '2025-12-15.clover'
		});
	}

	/**
	 * Создать платеж (универсальный метод для Checkout или Elements)
	 */
	public async createPayment(params: {
		generationRequestId: number;
		amount: number;
		currency: string;
		hostname: string;
		provider: string;
	}): Promise<PaymentLinkDtoResponse> {
		if (this.configService.stripe.paymentMethod === StripePaymentMethod.ELEMENTS) {
			return this.createPaymentIntent(params);
		} else {
			return this.createCheckoutSession(params);
		}
	}

	/**
	 * Создать Payment Intent для Elements
	 */
	private async createPaymentIntent(params: {
		generationRequestId: number;
		amount: number;
		currency: string;
		hostname: string;
		provider: string;
	}): Promise<PaymentLinkDtoResponse> {
		const { generationRequestId, amount, currency, hostname, provider } = params;

		const paymentIntent = await this.stripe.paymentIntents.create({
			amount: Math.round(amount * 100),
			currency: currency.toLowerCase(),
			metadata: {
				generationRequestId: generationRequestId.toString(),
				hostname,
				provider
			},
			automatic_payment_methods: {
				enabled: true
			}
		});

		return PaymentLinkDtoResponse.fromElements(paymentIntent.client_secret!, this.configService.stripe.publishableKey);
	}

	/**
	 * Создать Checkout Session и вернуть Response
	 */
	private async createCheckoutSession(params: {
		generationRequestId: number;
		amount: number;
		currency: string;
		hostname: string;
		provider: string;
	}): Promise<PaymentLinkDtoResponse> {
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

		return PaymentLinkDtoResponse.fromCheckout(session.url!, this.configService.stripe.publishableKey);
	}

	/**
	 * Получить Checkout Session из Stripe
	 */
	private async retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session> {
		return this.stripe.checkout.sessions.retrieve(sessionId);
	}

	/**
	 * Получить статус генерационного запроса на основе статуса Stripe (универсальный для Checkout и Elements)
	 */
	public async getGenerationRequestStatus(paymentId: string): Promise<{ status: GenerationRequestStatusValue | null; session: Stripe.Checkout.Session | null; paymentIntent: Stripe.PaymentIntent | null }> {
		// Определяем тип по префиксу ID
		if (paymentId.startsWith('cs_')) {
			// Checkout Session
			return this.getStatusFromCheckoutSession(paymentId);
		} else if (paymentId.startsWith('pi_')) {
			// Payment Intent
			return this.getStatusFromPaymentIntent(paymentId);
		} else {
			this.logger.error(`Unknown payment ID format: ${paymentId}`);
			return { status: null, session: null, paymentIntent: null };
		}
	}

	/**
	 * Получить статус из Checkout Session
	 */
	private async getStatusFromCheckoutSession(sessionId: string): Promise<{ status: GenerationRequestStatusValue | null; session: Stripe.Checkout.Session | null; paymentIntent: Stripe.PaymentIntent | null }> {
		try {
			const session = await this.retrieveSession(sessionId);

			// Маппинг Stripe статусов в GenerationRequestStatus
			if (session.payment_status === (StripePaymentStatus.PAID as string)
				&& session.status === (StripeSessionStatus.COMPLETE as string)
			) {
				return { status: GenerationRequestStatus.ACCEPTED.value, session, paymentIntent: null };
			} else {
				// Любой другой случай - ожидание оплаты
				return { status: GenerationRequestStatus.PENDING_PAYMENT.value, session, paymentIntent: null };
			}
		} catch (error) {
			this.logger.error(`Failed to get status for session ${sessionId}`, error);
			return { status: null, session: null, paymentIntent: null };
		}
	}

	/**
	 * Получить статус из Payment Intent
	 */
	private async getStatusFromPaymentIntent(paymentIntentId: string): Promise<{ status: GenerationRequestStatusValue | null; session: Stripe.Checkout.Session | null; paymentIntent: Stripe.PaymentIntent | null }> {
		try {
			const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

			// Маппинг Stripe статусов в GenerationRequestStatus
			if (paymentIntent.status === 'succeeded') {
				return { status: GenerationRequestStatus.ACCEPTED.value, session: null, paymentIntent };
			} else {
				// Любой другой случай - ожидание оплаты
				return { status: GenerationRequestStatus.PENDING_PAYMENT.value, session: null, paymentIntent };
			}
		} catch (error) {
			this.logger.error(`Failed to get status for payment intent ${paymentIntentId}`, error);
			return { status: null, session: null, paymentIntent: null };
		}
	}

	/**
	 * Извлечь payment ID из payment link или client secret
	 */
	public extractPaymentId(paymentLinkOrSecret: string): string | null {
		try {
			// Проверяем является ли это client secret (pi_xxx_secret_yyy)
			if (paymentLinkOrSecret.includes('_secret_')) {
				// Это Payment Intent client secret
				const paymentIntentId = paymentLinkOrSecret.split('_secret_')[0];
				if (paymentIntentId && paymentIntentId.startsWith('pi_')) {
					return paymentIntentId;
				}
			}

			// Пытаемся извлечь session ID из URL
			const url = new URL(paymentLinkOrSecret);
			const sessionId = url.pathname.split('/').pop();
			if (sessionId && sessionId.startsWith('cs_')) {
				return sessionId;
			}

			return null;
		} catch (error) {
			this.logger.error(`Failed to extract payment ID from: ${paymentLinkOrSecret}`, error);
			return null;
		}
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
