<script lang="ts">
	import type { OrderResponseDto } from '@api/shared';
	import type { TransitionDescriptorInterface, ActionRendererPropsInterface } from '$lib/domain/order';
	import type { Component } from 'svelte';
	import { ordersService } from '$lib/services/orders.service';

	interface Props {
		order: OrderResponseDto;
		transition: TransitionDescriptorInterface;
		renderer: Component<ActionRendererPropsInterface>;
		class?: string;
		disabled?: boolean;
		loading?: boolean;
	}

	let { order, transition, renderer, class: className = '', disabled = false, loading = false }: Props = $props();

	const Renderer = $derived(renderer);

	const handleDownload = () => ordersService.downloadArchive(order.attributes.id);
</script>

<Renderer
	{transition}
	label={transition.label}
	onclick={handleDownload}
	class={className}
	{disabled}
	{loading}
/>
