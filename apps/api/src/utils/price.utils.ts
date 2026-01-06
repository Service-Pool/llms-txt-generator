/**
 * Utility class for price calculations
 */
class PriceCalculator {
	/**
	 * Calculate estimated price for generation
	 *
	 * @param urlsCount - Number of URLs to process
	 * @param pricePerUrl - Price per single URL
	 * @param minPayment - Minimum payment threshold
	 * @param urlsNumPrecised - Whether URL count is precise (not timed out)
	 * @returns Calculated price rounded to 2 decimal places
	 */
	public static calculateEstimatedPrice(
		urlsCount: number,
		pricePerUrl: number,
		minPayment: number,
		urlsNumPrecised: boolean
	): number {
		const basePrice = urlsNumPrecised ? urlsCount * pricePerUrl : 100;
		const minPrice = pricePerUrl > 0 ? minPayment : 0;
		const estimatedPrice = Math.max(basePrice, minPrice);

		return Math.round(estimatedPrice * 100) / 100;
	}
}

export { PriceCalculator };
