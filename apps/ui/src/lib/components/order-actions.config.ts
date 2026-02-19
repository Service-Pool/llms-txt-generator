import {
	RefreshOutline,
	PlaySolid,
	CreditCardSolid,
	DownloadSolid,
	ExclamationCircleSolid,
	TrashBinSolid
} from 'flowbite-svelte-icons';
import { HateoasAction } from '@api/shared';
import type { Component } from 'svelte';
import { button } from 'flowbite-svelte';
import type { VariantProps } from 'tailwind-variants';

type ButtonColor = NonNullable<VariantProps<typeof button>['color']>;

interface ActionButtonConfig {
	id: string;
	icon: Component;
	label: string;
	labelAlternative?: string;
	description?: string;
	color: ButtonColor;
	hateoasActions: HateoasAction[];
	enabled?: boolean; // Default: true. Set to false to disable action on frontend
}

const ORDER_ACTION_BUTTONS: ActionButtonConfig[] = [
	{
		id: 'calculate',
		icon: RefreshOutline,
		label: 'Set Model',
		labelAlternative: 'Update Model',
		description: 'Select preferable AI Model',
		color: 'purple',
		hateoasActions: [HateoasAction.CALCULATE],
		enabled: true
	},
	{
		id: 'run',
		icon: PlaySolid,
		label: 'Start',
		description: 'Start order processing',
		color: 'green',
		hateoasActions: [HateoasAction.RUN],
		enabled: true
	},
	{
		id: 'payment',
		icon: CreditCardSolid,
		label: 'Pay Now',
		description: 'Complete payment to start processing',
		color: 'blue',
		hateoasActions: [HateoasAction.CHECKOUT, HateoasAction.PAYMENT_INTENT],
		enabled: true
	},
	{
		id: 'download',
		icon: DownloadSolid,
		label: 'Download',
		description: 'Download generated content',
		color: 'indigo',
		hateoasActions: [HateoasAction.DOWNLOAD],
		enabled: true
	},
	{
		id: 'refund',
		icon: ExclamationCircleSolid,
		label: 'Refund',
		description: 'Request refund for failed order',
		color: 'red',
		hateoasActions: [HateoasAction.REFUND],
		enabled: true
	},
	{
		id: 'delete',
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
function getActionConfig(id: string): ActionButtonConfig | undefined {
	return ORDER_ACTION_BUTTONS.find(action => action.id === id);
}

/**
 * Check if action is enabled in frontend configuration
 */
function isActionEnabled(hateoasAction: HateoasAction): boolean {
	const config = ORDER_ACTION_BUTTONS.find(action => action.hateoasActions.includes(hateoasAction));
	return config?.enabled !== false; // Default to true if not specified
}

export { type ActionButtonConfig, ORDER_ACTION_BUTTONS, getActionConfig, isActionEnabled };
