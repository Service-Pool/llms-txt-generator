import { HttpClient } from './api.service';
import { configService } from './config.service';
import { CheckoutSessionResponseDto, PaymentIntentResponseDto, type ApiResponse } from '@api/shared';

/**
 * Payments API Service
 * Handles payment-related operations (checkout, payment intent, refunds)
 */
class PaymentsService extends HttpClient {
	/**
	 * Create Stripe Checkout Session
	 * Returns a session with payment URL for redirect
	 */
	async createSession(orderId: number, successUrl?: string, cancelUrl?: string): Promise<ApiResponse<CheckoutSessionResponseDto>> {
		const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

		return this.fetch(
			configService.endpoints.payments.checkout(orderId),
			CheckoutSessionResponseDto,
			{
				method: 'POST',
				body: JSON.stringify({
					successUrl: successUrl || `${currentUrl}?payment=success`,
					cancelUrl: cancelUrl || `${currentUrl}?payment=cancelled`
				})
			}
		);
	}

	/**
	 * Create Payment Intent for embedded payment form
	 * Returns client secret for Stripe Elements
	 */
	async createPaymentIntent(orderId: number): Promise<ApiResponse<PaymentIntentResponseDto>> {
		return this.fetch(
			configService.endpoints.payments.intent(orderId),
			PaymentIntentResponseDto,
			{
				method: 'POST'
			}
		);
	}

	/**
	 * Request refund for a paid order
	 */
	async requestRefund(orderId: number): Promise<ApiResponse<string>> {
		return this.fetch(configService.endpoints.payments.refund(orderId), undefined, {
			method: 'POST'
		});
	}
}

const paymentsService = new PaymentsService();

export { paymentsService };
