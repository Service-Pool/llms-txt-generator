import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '../../../enums/order-status.enum';

/**
 * Order Status State Machine
 * Validates status transitions according to PRD section 6.2
 */
class OrderStatusMachine {
	/**
	 * Allowed status transitions map
	 * Each status can only transition to specific next statuses
	 */
	private static readonly ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
		[OrderStatus.CREATED]: [OrderStatus.CALCULATED],
		[OrderStatus.CALCULATED]: [OrderStatus.PENDING_PAYMENT, OrderStatus.QUEUED, OrderStatus.CALCULATED],
		[OrderStatus.PENDING_PAYMENT]: [OrderStatus.PAID, OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED],
		[OrderStatus.PAID]: [OrderStatus.QUEUED],
		[OrderStatus.QUEUED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
		[OrderStatus.PROCESSING]: [OrderStatus.COMPLETED, OrderStatus.FAILED, OrderStatus.CANCELLED],
		[OrderStatus.FAILED]: [OrderStatus.REFUNDED],
		// Terminal statuses - no transitions allowed
		[OrderStatus.COMPLETED]: [],
		[OrderStatus.CANCELLED]: [],
		[OrderStatus.REFUNDED]: [],
		[OrderStatus.PAYMENT_FAILED]: []
	};

	/**
	 * Check if transition from one status to another is allowed
	 * Idempotent: same status transition is always allowed
	 */
	public static canTransition(from: OrderStatus, to: OrderStatus): boolean {
		// Allow same status (idempotent operation)
		if (from === to) {
			return true;
		}

		const allowedStatuses = this.ALLOWED_TRANSITIONS[from];
		return allowedStatuses ? allowedStatuses.includes(to) : false;
	}

	/**
	 * Validate status transition and throw error if invalid
	 * @throws BadRequestException if transition is not allowed
	 */
	public static validateTransition(from: OrderStatus, to: OrderStatus): void {
		if (!this.canTransition(from, to)) {
			throw new BadRequestException(`Invalid status transition: ${from} → ${to}. Allowed transitions from ${from}: ${this.ALLOWED_TRANSITIONS[from].join(', ') || 'none (terminal status)'}`);
		}
	}

	/**
	 * Get all allowed transitions from current status
	 */
	public static getAllowedTransitions(from: OrderStatus): OrderStatus[] {
		return this.ALLOWED_TRANSITIONS[from] || [];
	}

	/**
	 * Check if status is terminal (no further transitions allowed)
	 */
	public static isTerminalStatus(status: OrderStatus): boolean {
		return this.ALLOWED_TRANSITIONS[status].length === 0;
	}
}

export { OrderStatusMachine };
