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

export { formatNumber };
