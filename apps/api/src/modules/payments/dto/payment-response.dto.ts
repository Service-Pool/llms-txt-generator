import { ApiProperty } from '@nestjs/swagger';
import { HateoasAction } from '@/enums/hateoas-action.enum';

/**
 * HATEOAS link interface
 */
interface HateoasLink {
	href: string;
	method?: string;
	description?: string;
}

/**
 * Build HATEOAS links for payment-related responses
 */
function buildPaymentLinks(orderId: number): Record<string, HateoasLink> {
	const links: Record<string, HateoasLink> = {
		[HateoasAction.SELF]: {
			href: `/api/orders/${orderId}`,
			method: 'GET',
			description: 'Get order details'
		},
		[HateoasAction.RUN]: {
			href: `/api/orders/${orderId}/run`,
			method: 'POST',
			description: 'Check payment and start processing'
		}
	};

	return links;
}

/**
 * Checkout Session Attributes
 */
class CheckoutSessionAttributes {
	@ApiProperty({ description: 'Stripe checkout session ID', example: 'cs_1234567890' })
	sessionId: string;

	@ApiProperty({ description: 'Payment URL for checkout', example: 'https://checkout.stripe.com/pay/cs_1234567890' })
	paymentUrl: string;

	@ApiProperty({ description: 'Order ID', example: 123 })
	orderId: number;

	static create(orderId: number, sessionId: string, paymentUrl: string): CheckoutSessionAttributes {
		const attributes = new CheckoutSessionAttributes();
		attributes.sessionId = sessionId;
		attributes.paymentUrl = paymentUrl;
		attributes.orderId = orderId;
		return attributes;
	}

	static fromJSON(json: Record<string, unknown>): CheckoutSessionAttributes {
		const attributes = new CheckoutSessionAttributes();
		attributes.sessionId = json.sessionId as string;
		attributes.paymentUrl = json.paymentUrl as string;
		attributes.orderId = json.orderId as number;
		return attributes;
	}
}

/**
 * Response DTO for Checkout Session creation
 */
class CheckoutSessionResponseDto {
	@ApiProperty({ description: 'Checkout session attributes', type: CheckoutSessionAttributes })
	attributes: CheckoutSessionAttributes;

	@ApiProperty({
		description: 'HATEOAS navigation links',
		example: {
			self: { href: '/api/orders/123', method: 'GET', description: 'Get order details' },
			run: { href: '/api/orders/123/run', method: 'POST', description: 'Check payment and start processing' }
		}
	})
	_links: Partial<Record<HateoasAction, HateoasLink>>;

	static create(orderId: number, sessionId: string, paymentUrl: string): CheckoutSessionResponseDto {
		const dto = new CheckoutSessionResponseDto();
		dto.attributes = CheckoutSessionAttributes.create(orderId, sessionId, paymentUrl);
		dto._links = buildPaymentLinks(orderId);
		return dto;
	}

	static fromJSON(json: Record<string, unknown>): CheckoutSessionResponseDto {
		const dto = new CheckoutSessionResponseDto();
		dto.attributes = CheckoutSessionAttributes.fromJSON(json.attributes as Record<string, unknown>);
		dto._links = json._links as Partial<Record<HateoasAction, HateoasLink>>;
		return dto;
	}
}

/**
 * Payment Intent Attributes
 */
class PaymentIntentAttributes {
	@ApiProperty({ description: 'Stripe Payment Intent client secret', example: 'pi_1234567890_secret_abcd1234' })
	clientSecret: string;

	@ApiProperty({ description: 'Stripe publishable key for frontend', example: 'pk_live_abcdefghijklmnop' })
	publishableKey: string;

	@ApiProperty({ description: 'Order ID', example: 123 })
	orderId: number;

	static create(orderId: number, clientSecret: string, publishableKey: string): PaymentIntentAttributes {
		const attributes = new PaymentIntentAttributes();
		attributes.clientSecret = clientSecret;
		attributes.publishableKey = publishableKey;
		attributes.orderId = orderId;
		return attributes;
	}

	static fromJSON(json: Record<string, unknown>): PaymentIntentAttributes {
		const attributes = new PaymentIntentAttributes();
		attributes.clientSecret = json.clientSecret as string;
		attributes.publishableKey = json.publishableKey as string;
		attributes.orderId = json.orderId as number;
		return attributes;
	}
}

/**
 * Response DTO for Payment Intent creation
 */
class PaymentIntentResponseDto {
	@ApiProperty({ description: 'Payment intent attributes', type: PaymentIntentAttributes })
	attributes: PaymentIntentAttributes;

	@ApiProperty({
		description: 'HATEOAS navigation links',
		example: {
			self: { href: '/api/orders/123', method: 'GET', description: 'Get order details' },
			run: { href: '/api/orders/123/run', method: 'POST', description: 'Check payment and start processing' }
		}
	})
	_links: Partial<Record<HateoasAction, HateoasLink>>;

	static create(orderId: number, clientSecret: string, publishableKey: string): PaymentIntentResponseDto {
		const dto = new PaymentIntentResponseDto();
		dto.attributes = PaymentIntentAttributes.create(orderId, clientSecret, publishableKey);
		dto._links = buildPaymentLinks(orderId);
		return dto;
	}

	static fromJSON(json: Record<string, unknown>): PaymentIntentResponseDto {
		const dto = new PaymentIntentResponseDto();
		dto.attributes = PaymentIntentAttributes.fromJSON(json.attributes as Record<string, unknown>);
		dto._links = json._links as Partial<Record<HateoasAction, HateoasLink>>;
		return dto;
	}
}

export { CheckoutSessionResponseDto, PaymentIntentResponseDto };
