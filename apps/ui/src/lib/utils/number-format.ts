/**
 * Format number according to user's locale
 * @param value - Number to format
 * @returns Formatted number string (e.g., 1000 -> "1,000" or "1 000")
 */
function formatNumber(value: number | null | undefined): string {
	if (value === null || value === undefined) {
		return '0';
	}

	return new Intl.NumberFormat().format(value);
}

/**
 * Format price with fixed decimal places
 * @param value - Price to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted price string (e.g., 0.518 -> "0.52")
 */
function formatPrice(value: number | null | undefined, decimals: number = 2): string {
	if (value === null || value === undefined) {
		return '0.00';
	}

	return value.toFixed(decimals);
}

export { formatNumber, formatPrice };
