const GenerationRequestStatus = {
	PENDING_PAYMENT: {
		value: 10,
		label: 'Pending payment'
	},
	ACCEPTED: {
		value: 20,
		label: 'Accepted'
	},
	REFUNDED: {
		value: 30,
		label: 'Refunded'
	}
} as const;

/**
 * Threshold для определения оплачен ли запрос.
 * Если status >= PAID_THRESHOLD, запрос можно ставить в очередь.
 */
const PAID_THRESHOLD = GenerationRequestStatus.ACCEPTED.value;

/**
 * Тип для числовых значений статуса
 */
type GenerationRequestStatusValue = typeof GenerationRequestStatus[keyof typeof GenerationRequestStatus]['value'];

export {
	GenerationRequestStatus,
	PAID_THRESHOLD,
	type GenerationRequestStatusValue
};
