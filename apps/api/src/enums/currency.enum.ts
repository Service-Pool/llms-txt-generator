/**
 * ISO 4217 Currency codes
 */
enum Currency {
	EUR = 'EUR'
}

/**
 * Currency symbols mapping
 */
const CURRENCY_SYMBOLS: Record<Currency, string> = {
	[Currency.EUR]: '€'
};

export { Currency, CURRENCY_SYMBOLS };
