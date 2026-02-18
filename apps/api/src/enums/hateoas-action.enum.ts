/**
 * HATEOAS action link keys
 * Used in _links object to identify available actions
 */
enum HateoasAction {
	/**
	 * Link to the resource itself (GET)
	 */
	SELF = 'self',

	/**
	 * Calculate order price and select model (POST)
	 */
	CALCULATE = 'calculate',

	/**
	 * Start order processing or check payment and start (POST)
	 */
	RUN = 'run',

	/**
	 * Create or get Stripe checkout session (POST)
	 */
	CHECKOUT = 'checkout',

	/**
	 * Create or get Stripe payment intent (POST)
	 */
	PAYMENT_INTENT = 'paymentIntent',

	/**
	 * Download generated llms.txt (GET)
	 */
	DOWNLOAD = 'download',

	/**
	 * Request refund for failed order (POST)
	 */
	REFUND = 'refund',

	/**
	 * Delete order (soft delete) (DELETE)
	 */
	DELETE = 'delete'
}

export { HateoasAction };
