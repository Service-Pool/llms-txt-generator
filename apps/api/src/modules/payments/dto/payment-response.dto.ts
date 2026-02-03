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
		self: {
			href: `/api/orders/${orderId}`,
			method: 'GET',
			description: 'Get order details'
		},
		run: {
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
	sessionId: string;
	orderId: number;
	_links: Record<string, HateoasLink>;

	public static create(orderId: number, sessionId: string): CheckoutSessionResponseDto {
		const dto = new CheckoutSessionResponseDto();
		dto.sessionId = sessionId;
		dto.orderId = orderId;
		dto._links = buildPaymentLinks(orderId);

		return dto;
	}
}

/**
 * Response DTO for Payment Intent creation
 */
class PaymentIntentResponseDto {
	clientSecret: string;
	orderId: number;
	_links: Record<string, HateoasLink>;

	public static create(orderId: number, clientSecret: string): PaymentIntentResponseDto {
		const dto = new PaymentIntentResponseDto();
		dto.clientSecret = clientSecret;
		dto.orderId = orderId;
		dto._links = buildPaymentLinks(orderId);

		return dto;
	}
}

export { CheckoutSessionResponseDto, PaymentIntentResponseDto };
