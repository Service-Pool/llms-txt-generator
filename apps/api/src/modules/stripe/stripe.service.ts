import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../config/config.service';
import { GenerationRequestStatus, type GenerationRequestStatusValue } from '../../enums/generation-request-status.enum';
import { StripePaymentStatus } from '../../enums/stripe-payment-status.enum';
import { StripeSessionStatus } from '../../enums/stripe-session-status.enum';
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
	 * Получить checkout session (alias для retrieveSession)
	 */
	public async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
		return this.retrieveSession(sessionId);
	}

	/**
	 * Получить статус генерационного запроса на основе статуса Stripe session
	 */
	public async getGenerationRequestStatus(sessionId: string): Promise<{ status: GenerationRequestStatusValue | null; session: Stripe.Checkout.Session | null }> {
		try {
			const session = await this.getCheckoutSession(sessionId);

			// Маппинг Stripe статусов в GenerationRequestStatus
			if (session.payment_status === (StripePaymentStatus.PAID as string)
				&& session.status === (StripeSessionStatus.COMPLETE as string)
			) {
				return { status: GenerationRequestStatus.ACCEPTED.value, session };
			} else {
				// Любой другой случай - ожидание оплаты
				return { status: GenerationRequestStatus.PENDING_PAYMENT.value, session };
			}
		} catch (error) {
			this.logger.error(`Failed to get status for session ${sessionId}`, error);
			return { status: null, session: null };
		}
	}

	/**
	 * Извлечь session ID из payment link
	 */
	public extractSessionId(paymentLink: string): string | null {
		try {
			const url = new URL(paymentLink);
			const sessionId = url.pathname.split('/').pop();
			if (!sessionId || !sessionId.startsWith('cs_')) {
				return null;
			}
			return sessionId;
		} catch (error) {
			this.logger.error(`Failed to extract session ID from payment link: ${paymentLink}`, error);
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
