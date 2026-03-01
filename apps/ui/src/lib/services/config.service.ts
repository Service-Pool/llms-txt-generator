import { env } from '$env/dynamic/public';
import {
	RefreshOutline,
	PlaySolid,
	CreditCardSolid,
	DownloadSolid,
	ExclamationCircleSolid,
	TrashBinSolid
} from 'flowbite-svelte-icons';
import { HateoasAction, OrderStatus } from '@api/shared';
import type { Component } from 'svelte';
import { button } from 'flowbite-svelte';
import type { VariantProps } from 'tailwind-variants';
import { StepActionIdEnum } from '$lib/domain/order/step-action-id.enum';

type ButtonColor = NonNullable<VariantProps<typeof button>['color']>;
type StatusColor = 'primary' | 'secondary' | 'gray' | 'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green' | 'emerald' | 'teal' | 'cyan' | 'sky' | 'blue' | 'indigo' | 'violet' | 'fuchsia' | 'purple' | 'pink' | 'rose';

interface StatusConfig {
	label: string;
	color: StatusColor;
}

export interface ActionButtonConfig {
	id: StepActionIdEnum;
	icon: Component;
	label: string;
	labelAlternative?: string;
	description?: string;
	color: ButtonColor;
	hateoasActions: HateoasAction[];
	enabled?: boolean; // Default: true. Set to false to disable action on frontend
}

class ConfigService {
	// API config
	public readonly api: { baseUrl: string } = {
		baseUrl: env.PUBLIC_API_URL
	};

	// HTTP client config
	public readonly http: { timeout: number } = {
		timeout: Number(env.PUBLIC_HTTP_TIMEOUT)
	};

	// Stripe config
	public readonly stripe: { paymentMethod: 'checkout' | 'elements' } = {
		paymentMethod: (String(env.PUBLIC_STRIPE_PAYMENT_METHOD)) as 'checkout' | 'elements'
	};

	// Analytics config
	public readonly clarity: { id: string | undefined } = {
		id: env.PUBLIC_CLARITY_ID
	};

	// Endpoints config - centralized route definitions
	public readonly endpoints = {
		orders: {
			base: '/api/orders',
			byId: (id: number) => `/api/orders/${id}`,
			availableModels: (id: number) => `/api/orders/${id}/available-models`,
			calculate: (id: number) => `/api/orders/${id}/calculate`,
			run: (id: number) => `/api/orders/${id}/run`,
			download: (id: number) => `/api/orders/${id}/download`
		},
		payments: {
			checkout: (orderId: number) => `/api/orders/${orderId}/payment/checkout`,
			intent: (orderId: number) => `/api/orders/${orderId}/payment/intent`,
			refund: (orderId: number) => `/api/orders/${orderId}/payment/refund`
		},
		stats: {
			completed: '/api/stats/completed'
		},
		auth: {
			loginLinkRequest: '/api/auth/login-link-request',
			login: '/api/auth/login',
			logout: '/api/auth/logout',
			status: '/api/auth/me'
		}
	};

	// UI Routes config - centralized route definitions for frontend
	public readonly routes = {
		home: '/',
		about: '/about',
		api: '/api',
		orders: '/orders',
		ordersNew: '/orders/new',
		orderById: (id: number) => `/orders/${id}`,
		auth: {
			request: '/auth/request',
			verify: '/auth/verify'
		}
	};

	// Order statuses config
	public readonly orderStatuses: Record<OrderStatus, StatusConfig> = {
		[OrderStatus.CREATED]: { label: 'Draft', color: 'secondary' },
		[OrderStatus.CALCULATED]: { label: 'Calculated', color: 'indigo' },
		[OrderStatus.PENDING_PAYMENT]: { label: 'Pending Payment', color: 'yellow' },
		[OrderStatus.PAID]: { label: 'Paid', color: 'green' },
		[OrderStatus.QUEUED]: { label: 'Queued', color: 'purple' },
		[OrderStatus.PROCESSING]: { label: 'Processing', color: 'purple' },
		[OrderStatus.COMPLETED]: { label: 'Completed', color: 'green' },
		[OrderStatus.FAILED]: { label: 'Failed', color: 'red' },
		[OrderStatus.PAYMENT_FAILED]: { label: 'Payment Failed', color: 'red' },
		[OrderStatus.CANCELLED]: { label: 'Cancelled', color: 'gray' },
		[OrderStatus.REFUNDED]: { label: 'Refunded', color: 'gray' }
	};

	// Order actions config
	public readonly orderActions: ActionButtonConfig[] = [
		{
			id: StepActionIdEnum.Calculate,
			icon: RefreshOutline,
			label: 'Set Model',
			labelAlternative: 'Update Model',
			description: 'Select preferable AI Model',
			color: 'purple',
			hateoasActions: [HateoasAction.CALCULATE],
			enabled: true
		},
		{
			id: StepActionIdEnum.Run,
			icon: PlaySolid,
			label: 'Start',
			labelAlternative: 'Restart',
			description: 'Start order processing',
			color: 'green',
			hateoasActions: [HateoasAction.RUN],
			enabled: true
		},
		{
			id: StepActionIdEnum.Payment,
			icon: CreditCardSolid,
			label: 'Pay Now',
			description: 'Complete payment to start processing',
			color: 'blue',
			hateoasActions: [HateoasAction.CHECKOUT, HateoasAction.PAYMENT_INTENT],
			enabled: true
		},
		{
			id: StepActionIdEnum.Download,
			icon: DownloadSolid,
			label: 'Download',
			description: 'Download generated content',
			color: 'indigo',
			hateoasActions: [HateoasAction.DOWNLOAD],
			enabled: true
		},
		{
			id: StepActionIdEnum.Refund,
			icon: ExclamationCircleSolid,
			label: 'Refund',
			description: 'Request refund for failed order',
			color: 'gray',
			hateoasActions: [HateoasAction.REFUND],
			enabled: true
		},
		{
			id: StepActionIdEnum.Delete,
			icon: TrashBinSolid,
			label: 'Delete',
			description: 'Delete this order',
			color: 'red',
			hateoasActions: [HateoasAction.DELETE],
			enabled: true
		}
	];

	/**
	 * Get action config by id
	 */
	public getActionConfig(id: StepActionIdEnum): ActionButtonConfig | undefined {
		return this.orderActions.find(action => action.id === id);
	}

	/**
	 * Check if action is enabled in frontend configuration
	 */
	public isActionEnabled(hateoasAction: HateoasAction): boolean {
		const config = this.orderActions.find(action => action.hateoasActions.includes(hateoasAction));
		return config?.enabled !== false; // Default to true if not specified
	}

	// WebSocket config
	public readonly websocket = {
		path: env.PUBLIC_SOCKET_PATH,
		get url(): string {
			const baseUrl = env.PUBLIC_API_URL;

			// If baseUrl is empty, use current window location
			if (!baseUrl) {
				const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
				return `${protocol}//${window.location.host}/ws`;
			}

			// Convert http(s) to ws(s)
			const wsUrl = baseUrl.replace(/^http/, 'ws');
			return `${wsUrl}${this.path}`;
		}
	};
}

// Singleton instance
const configService = new ConfigService();

export { type StatusColor, type StatusConfig, configService };
