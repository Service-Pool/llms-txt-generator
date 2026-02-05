export enum WebSocketEvent {
	STATS_UPDATE = 'stats:update',
	ORDER_QUEUE = 'order:queue',
	ORDER_PROGRESS = 'order:progress',
	ORDER_COMPLETION = 'order:completion',
	SUBSCRIPTION_ACK = 'subscription:ack'
}
