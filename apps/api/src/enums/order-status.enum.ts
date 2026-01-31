export enum OrderStatus {
	CREATED = 'created',
	PENDING_PAYMENT = 'pending_payment',
	PAID = 'paid',
	PAYMENT_FAILED = 'payment_failed',
	QUEUED = 'queued',
	PROCESSING = 'processing',
	COMPLETED = 'completed',
	FAILED = 'failed',
	CANCELLED = 'cancelled',
	REFUNDED = 'refunded'
}
