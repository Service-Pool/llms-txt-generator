/**
 * ISO 4217 Currency codes
 */
export enum Currency {
	EUR = 'EUR'
}

/**
 * Currency symbols mapping
 */
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
	[Currency.EUR]: '€'
};
