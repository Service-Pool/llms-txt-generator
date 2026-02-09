import {
	ChartMixedDollarSolid,
	PlaySolid,
	CreditCardSolid,
	DownloadSolid,
	ExclamationCircleSolid
} from 'flowbite-svelte-icons';
import { HateoasAction } from '@api/shared';
import type { Component } from 'svelte';

type ButtonColor = 'purple' | 'green' | 'blue' | 'red' | 'yellow' | 'indigo' | 'gray';

interface ActionButtonConfig {
	id: string;
	icon: Component;
	label: string;
	labelAlternative?: string;
	description?: string;
	color: ButtonColor;
	cardBgClass?: string;
	iconColorClass?: string;
	hateoasActions: HateoasAction[];
}

const ORDER_ACTION_BUTTONS: ActionButtonConfig[] = [
	{
		id: 'calculate',
		icon: ChartMixedDollarSolid,
		label: 'Set Model',
		labelAlternative: 'Change Model',
		description: 'Select preferable AI Model',
		color: 'purple',
		cardBgClass: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
		iconColorClass: 'text-purple-600 dark:text-purple-400',
		hateoasActions: [HateoasAction.CALCULATE]
	},
	{
		id: 'run',
		icon: PlaySolid,
		label: 'Start',
		description: 'Start order processing',
		color: 'green',
		cardBgClass: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
		iconColorClass: 'text-green-600 dark:text-green-400',
		hateoasActions: [HateoasAction.RUN]
	},
	{
		id: 'payment',
		icon: CreditCardSolid,
		label: 'Pay Now',
		description: 'Complete payment to start processing',
		color: 'blue',
		cardBgClass: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
		iconColorClass: 'text-blue-600 dark:text-blue-400',
		hateoasActions: [HateoasAction.CHECKOUT, HateoasAction.PAYMENT_INTENT]
	},
	{
		id: 'download',
		icon: DownloadSolid,
		label: 'Download',
		description: 'Download generated content',
		color: 'green',
		cardBgClass: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
		iconColorClass: 'text-green-600 dark:text-green-400',
		hateoasActions: [HateoasAction.DOWNLOAD]
	},
	{
		id: 'refund',
		icon: ExclamationCircleSolid,
		label: 'Refund',
		description: 'Request refund for failed order',
		color: 'red',
		cardBgClass: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
		iconColorClass: 'text-red-600 dark:text-red-400',
		hateoasActions: [HateoasAction.REFUND]
	}
];

/**
 * Get available action buttons for an order based on its HATEOAS links
 */
function getAvailableActionButtons(orderLinks: Partial<Record<HateoasAction, unknown>> | undefined): ActionButtonConfig[] {
	if (!orderLinks) return [];

	return ORDER_ACTION_BUTTONS.filter(action => action.hateoasActions.some(hateoasAction => hateoasAction in orderLinks));
}

/**
 * Get action config by id
 */
function getActionConfig(id: string): ActionButtonConfig | undefined {
	return ORDER_ACTION_BUTTONS.find(action => action.id === id);
}

export { getAvailableActionButtons, getActionConfig };
