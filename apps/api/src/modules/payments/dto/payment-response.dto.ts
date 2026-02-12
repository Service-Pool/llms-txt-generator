import { ApiProperty } from '@nestjs/swagger';
import { HateoasAction } from '../../../enums/hateoas-action.enum';

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
 * Response DTO for Checkout Session creation
 */
class CheckoutSessionResponseDto {
	@ApiProperty({ description: 'Stripe checkout session ID', example: 'cs_1234567890' })
	sessionId: string;

	@ApiProperty({ description: 'Payment URL for checkout', example: 'https://checkout.stripe.com/pay/cs_1234567890' })
	paymentUrl: string;

	@ApiProperty({ description: 'Order ID', example: 123 })
	orderId: number;

	@ApiProperty({
		description: 'HATEOAS navigation links',
		example: {
			self: { href: '/api/orders/123', method: 'GET', description: 'Get order details' },
			run: { href: '/api/orders/123/run', method: 'POST', description: 'Check payment and start processing' }
		}
	})
	_links: Partial<Record<HateoasAction, HateoasLink>>;

	public static create(orderId: number, sessionId: string, paymentUrl: string): CheckoutSessionResponseDto {
		const dto = new CheckoutSessionResponseDto();
		dto.sessionId = sessionId;
		dto.paymentUrl = paymentUrl;
		dto.orderId = orderId;
		dto._links = buildPaymentLinks(orderId);

		return dto;
	}

	public static fromJSON(json: Record<string, unknown>): CheckoutSessionResponseDto {
		const dto = new CheckoutSessionResponseDto();
		dto.sessionId = json.sessionId as string;
		dto.paymentUrl = json.paymentUrl as string;
		dto.orderId = json.orderId as number;
		dto._links = json._links as Partial<Record<HateoasAction, HateoasLink>>;
		return dto;
	}
}

/**
 * Response DTO for Payment Intent creation
 */
class PaymentIntentResponseDto {
	@ApiProperty({ description: 'Stripe Payment Intent client secret', example: 'pi_1234567890_secret_abcd1234' })
	clientSecret: string;

	@ApiProperty({ description: 'Stripe publishable key for frontend', example: 'pk_live_abcdefghijklmnop' })
	publishableKey: string;

	@ApiProperty({ description: 'Order ID', example: 123 })
	orderId: number;

	@ApiProperty({
		description: 'HATEOAS navigation links',
		example: {
			self: { href: '/api/orders/123', method: 'GET', description: 'Get order details' },
			run: { href: '/api/orders/123/run', method: 'POST', description: 'Check payment and start processing' }
		}
	})
	_links: Partial<Record<HateoasAction, HateoasLink>>;

	public static create(orderId: number, clientSecret: string, publishableKey: string): PaymentIntentResponseDto {
		const dto = new PaymentIntentResponseDto();
		dto.clientSecret = clientSecret;
		dto.publishableKey = publishableKey;
		dto.orderId = orderId;
		dto._links = buildPaymentLinks(orderId);

		return dto;
	}

	public static fromJSON(json: Record<string, unknown>): PaymentIntentResponseDto {
		const dto = new PaymentIntentResponseDto();
		dto.clientSecret = json.clientSecret as string;
		dto.publishableKey = json.publishableKey as string;
		dto.orderId = json.orderId as number;
		dto._links = json._links as Partial<Record<HateoasAction, HateoasLink>>;
		return dto;
	}
}

export { CheckoutSessionResponseDto, PaymentIntentResponseDto };
