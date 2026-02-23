/**
 * Order Components - Централизованный экспорт
 *
 * Все компоненты для работы с заказами в одном месте.
 * Заменяет множество index.ts файлов в подпапках.
 */

// === Public API (для routes) ===
export { default as OrderListItem } from './order/OrderListItem.svelte';
export { default as OrderDetails } from './order/OrderDetails.svelte';
export { default as OrdersList } from './order/OrdersList.svelte';

// === Layouts (структура) ===
export { default as OrderDetailsLayout } from './order/layouts/OrderDetailsLayout.svelte';
export { default as OrderListItemLayout } from './order/layouts/OrderListItemLayout.svelte';

// === Content (отображение данных) ===
export { default as OrderBadge } from './order/content/OrderBadge.svelte';
export { default as OrderStatus } from './order/content/OrderStatus.svelte';
export { default as OrderMeta } from './order/content/OrderMeta.svelte';
export { default as OrderOutput } from './order/content/stats/OrderOutput.svelte';
export { default as OrderErrors } from './order/content/stats/OrderErrors.svelte';
export { default as OrderInfo } from './order/content/stats/OrderInfo.svelte';

// === Composites (составные компоненты) ===
export { default as ActionsSpeedDial } from './order/composites/ActionsSpeedDial.svelte';
export { default as OrderStepper } from './order/composites/OrderStepper.svelte';

// === Actions (бизнес-логика + взаимодействие) ===
export { default as CalculateAction } from './order/actions/CalculateAction.svelte';
export { default as PaymentAction } from './order/actions/PaymentAction.svelte';
export { default as RunAction } from './order/actions/RunAction.svelte';
export { default as DownloadAction } from './order/actions/DownloadAction.svelte';
export { default as DeleteAction } from './order/actions/DeleteAction.svelte';

// === Modals (модальные окна) ===
export { default as CalculateModal } from './order/modals/CalculateModal.svelte';
export { default as StripeElementsModal } from './order/modals/StripeElementsModal.svelte';

// === Renderers (визуализация) ===
export { default as ActionButton } from './order/renderers/ActionButton.svelte';
export { default as ActionSpeedDialButton } from './order/renderers/ActionSpeedDialButton.svelte';
